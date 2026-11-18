import csv
import io
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import (
    CreditRecord,
    FinancialAccount,
    Investment,
    InvestmentSale,
    LendingRecord,
    MonthlyBudget,
    SavingsGoal,
    Transaction,
)

ZERO = Decimal('0.00')


def user_local_date(user):
    from .services import user_local_date as local_date
    return local_date(user)


def parse_date(value, fallback):
    if not value:
        return fallback
    try:
        return date.fromisoformat(value)
    except ValueError:
        return fallback


def resolve_report_period(user, params):
    today = user_local_date(user)
    period = (params.get('period') or 'monthly').lower()
    date_from = parse_date(params.get('date_from'), None)
    date_to = parse_date(params.get('date_to'), None)

    if date_from or date_to:
        start = date_from or date_to
        end = date_to or date_from
        if start > end:
            start, end = end, start
    elif period == 'daily':
        start = end = today
    elif period == 'yearly':
        start = date(today.year, 1, 1)
        end = date(today.year, 12, 31)
    else:
        period = 'monthly'
        start = date(today.year, today.month, 1)
        if today.month == 12:
            end = date(today.year, 12, 31)
        else:
            end = date(today.year, today.month + 1, 1) - timedelta(days=1)

    return period, start, end


def resolve_account(user, account_id):
    accounts = FinancialAccount.objects.filter(user=user)
    if account_id:
        account = accounts.filter(pk=account_id).first()
        if not account:
            return None
        return account
    return None


def build_report(user, params):
    period, start, end = resolve_report_period(user, params)
    account = resolve_account(user, params.get('account_id'))
    transactions = Transaction.objects.filter(
        account__user=user,
        is_voided=False,
        date__gte=start,
        date__lte=end,
    )
    if account:
        transactions = transactions.filter(account=account)
    category_id = params.get('category')
    if category_id:
        transactions = transactions.filter(category_id=category_id)

    income = transactions.filter(transaction_type=Transaction.TransactionType.ADD_CASH).aggregate(
        total=Sum('amount')
    )['total'] or ZERO
    expenses = transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE).aggregate(
        total=Sum('amount')
    )['total'] or ZERO

    category_rows = list(
        transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE)
        .exclude(category=None)
        .values('category_id', 'category__name')
        .annotate(amount=Sum('amount'))
        .order_by('-amount', 'category__name')
    )
    uncategorized = transactions.filter(
        transaction_type=Transaction.TransactionType.EXPENSE,
        category=None,
    ).aggregate(total=Sum('amount'))['total'] or ZERO
    categories = [
        {'category_id': str(row['category_id']), 'name': row['category__name'], 'amount': row['amount']}
        for row in category_rows
    ]
    if uncategorized:
        categories.append({'category_id': None, 'name': 'Uncategorized', 'amount': uncategorized})

    account_filter = {'account': account} if account else {'account__user': user}
    lending_outstanding = LendingRecord.objects.filter(
        outstanding_amount__gt=ZERO, **account_filter
    ).aggregate(total=Sum('outstanding_amount'))['total'] or ZERO
    credit_outstanding = CreditRecord.objects.filter(
        outstanding_amount__gt=ZERO, **account_filter
    ).aggregate(total=Sum('outstanding_amount'))['total'] or ZERO
    saved_wallet = SavingsGoal.objects.filter(status=SavingsGoal.Status.ACTIVE, **account_filter).aggregate(
        total=Sum('saved_amount')
    )['total'] or ZERO

    investment_filter = account_filter
    remaining_cost_basis = Investment.objects.filter(
        is_closed=False, **investment_filter
    ).aggregate(total=Sum('cost_basis'))['total'] or ZERO
    realized_sales = InvestmentSale.objects.filter(investment__account__user=user)
    if account:
        realized_sales = realized_sales.filter(investment__account=account)
    realized_gain_loss = realized_sales.aggregate(
        total=Sum('realized_gain_loss')
    )['total'] or ZERO

    cash = account.cash_balance if account else FinancialAccount.objects.filter(user=user).aggregate(
        total=Sum('cash_balance')
    )['total'] or ZERO
    bank = account.bank_balance if account else FinancialAccount.objects.filter(user=user).aggregate(
        total=Sum('bank_balance')
    )['total'] or ZERO

    budgets = list(MonthlyBudget.objects.filter(
        user=user, is_active=True, month__year=start.year, month__month=start.month,
        **({'account': account} if account else {})
    ).select_related('category'))
    budget_rows = []
    if budgets:
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        month_expenses = list(transactions.filter(
            transaction_type=Transaction.TransactionType.EXPENSE,
            date__gte=start,
            date__lt=next_month
        ).values('category_id', 'amount'))
        overall_spent = sum((e['amount'] for e in month_expenses), ZERO)
        cat_spent_map = defaultdict(lambda: ZERO)
        for e in month_expenses:
            if e['category_id']:
                cat_spent_map[e['category_id']] += e['amount']

        for budget in budgets:
            budget_spent = cat_spent_map[budget.category_id] if budget.category_id else overall_spent
            usage = (budget_spent / budget.amount * Decimal('100')).quantize(Decimal('0.01')) if budget.amount else ZERO
            budget_rows.append({
                'scope': budget.category.name if budget.category else 'Overall',
                'amount': budget.amount,
                'spent': budget_spent,
                'remaining': budget.amount - budget_spent,
                'usage_percentage': usage,
            })

    return {
        'period': period,
        'date_from': start.isoformat(),
        'date_to': end.isoformat(),
        'account': {
            'id': str(account.id) if account else None,
            'name': account.name if account else 'All accounts',
        } if account or not params.get('account_id') else None,
        'income': income,
        'expenses': expenses,
        'net_income_minus_expenses': income - expenses,
        'cash_balance': cash,
        'bank_balance': bank,
        'available_balance': cash + bank,
        'lending_outstanding': lending_outstanding,
        'credit_outstanding': credit_outstanding,
        'saved_wallet': saved_wallet,
        'investment_cost_basis': remaining_cost_basis,
        'realized_gain_loss': realized_gain_loss,
        'categories': categories,
        'budgets': budget_rows,
    }


def build_trends(user, params):
    period, start, end = resolve_report_period(user, params)
    account = resolve_account(user, params.get('account_id'))
    transactions = Transaction.objects.filter(
        account__user=user,
        is_voided=False,
        date__gte=start,
        date__lte=end,
    )
    if account:
        transactions = transactions.filter(account=account)
    category_id = params.get('category')
    if category_id:
        transactions = transactions.filter(category_id=category_id)

    # Fetch all matching transactions in ONE query to avoid N+1 DB round-trips
    txns = list(transactions.filter(
        transaction_type__in=[
            Transaction.TransactionType.ADD_CASH,
            Transaction.TransactionType.EXPENSE,
        ]
    ).values('date', 'transaction_type', 'amount'))

    day_map = defaultdict(lambda: {'income': ZERO, 'expenses': ZERO})
    for t in txns:
        d = t['date']
        amt = t['amount']
        if t['transaction_type'] == Transaction.TransactionType.ADD_CASH:
            day_map[d]['income'] += amt
        elif t['transaction_type'] == Transaction.TransactionType.EXPENSE:
            day_map[d]['expenses'] += amt

    if period == 'yearly':
        points = []
        for month_number in range(1, 13):
            month_start = date(start.year, month_number, 1)
            if month_number == 12:
                month_end = date(start.year, 12, 31)
            else:
                month_end = date(start.year, month_number + 1, 1) - timedelta(days=1)
            m_income = ZERO
            m_expenses = ZERO
            curr = month_start
            while curr <= month_end:
                if curr in day_map:
                    m_income += day_map[curr]['income']
                    m_expenses += day_map[curr]['expenses']
                curr += timedelta(days=1)
            points.append({'label': month_start.strftime('%b'), 'income': m_income, 'expenses': m_expenses})
        return {'period': period, 'points': points}

    if period == 'monthly':
        points = []
        current = start
        while current <= end:
            val = day_map.get(current, {'income': ZERO, 'expenses': ZERO})
            points.append({'label': current.strftime('%d'), 'income': val['income'], 'expenses': val['expenses']})
            current += timedelta(days=1)
        return {'period': period, 'points': points}

    points = []
    current = start
    while current <= end:
        val = day_map.get(current, {'income': ZERO, 'expenses': ZERO})
        points.append({'label': current.strftime('%d %b'), 'income': val['income'], 'expenses': val['expenses']})
        current += timedelta(days=1)
    return {'period': period, 'points': points}


def _csv_value(value):
    text = '' if value is None else str(value)
    if text.startswith(('=', '+', '-', '@', '\t', '\r')):
        return "'" + text
    return text


def build_csv_report(user, params):
    _, start, end = resolve_report_period(user, params)
    account = resolve_account(user, params.get('account_id'))
    transactions = Transaction.objects.filter(
        account__user=user,
        is_voided=False,
        date__gte=start,
        date__lte=end,
    ).select_related('account', 'category').order_by('date', 'created_at')
    if account:
        transactions = transactions.filter(account=account)
    category_id = params.get('category')
    if category_id:
        transactions = transactions.filter(category_id=category_id)
    if params.get('expense_only', '').lower() == 'true':
        transactions = transactions.filter(transaction_type=Transaction.TransactionType.EXPENSE)

    buffer = io.StringIO(newline='')
    buffer.write('\ufeff')
    writer = csv.writer(buffer)
    writer.writerow(['Date', 'Type', 'Category', 'Note', 'Amount (INR)', 'Balance Source', 'Financial Account'])
    for txn in transactions:
        writer.writerow([
            _csv_value(txn.date.isoformat()),
            _csv_value(txn.transaction_type),
            _csv_value(txn.category.name if txn.category else ''),
            _csv_value(txn.note),
            _csv_value(f'{txn.amount:.2f}'),
            _csv_value(txn.destination_balance_type if txn.transaction_type == Transaction.TransactionType.TRANSFER else txn.balance_type),
            _csv_value(txn.account.name),
        ])

    filename = f'apnawallet-transactions-{start.isoformat()}-to-{end.isoformat()}.csv'
    response = HttpResponse(buffer.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def build_pdf_report(user, params):
    report = build_report(user, params)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title='ApnaWallet Financial Report',
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph('ApnaWallet', styles['Title']),
        Paragraph('Financial Report', styles['Heading1']),
        Paragraph(f"Period: {report['date_from']} to {report['date_to']}", styles['Normal']),
        Paragraph(f"Account: {report['account']['name'] if report['account'] else 'All accounts'}", styles['Normal']),
        Spacer(1, 4 * mm),
    ]

    summary_rows = [
        ['Metric', 'INR'],
        ['Money received', f"{report['income']:.2f}"],
        ['Ordinary expenses', f"{report['expenses']:.2f}"],
        ['Net income minus expenses', f"{report['net_income_minus_expenses']:.2f}"],
        ['Cash balance', f"{report['cash_balance']:.2f}"],
        ['Bank balance', f"{report['bank_balance']:.2f}"],
        ['Available balance', f"{report['available_balance']:.2f}"],
        ['Money lent outstanding', f"{report['lending_outstanding']:.2f}"],
        ['Credit outstanding', f"{report['credit_outstanding']:.2f}"],
        ['Saved wallet', f"{report['saved_wallet']:.2f}"],
        ['Investment cost basis', f"{report['investment_cost_basis']:.2f}"],
        ['Realized gain/loss', f"{report['realized_gain_loss']:.2f}"],
    ]
    table = Table(summary_rows, repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f97316')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d6d3d1')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.extend([table, Spacer(1, 5 * mm), Paragraph('Expense Category Summary', styles['Heading2'])])

    category_rows = [['Category', 'INR']]
    category_rows.extend([[row['name'], f"{row['amount']:.2f}"] for row in report['categories']])
    if len(category_rows) == 1:
        category_rows.append(['No expenses', '0.00'])
    category_table = Table(category_rows, repeatRows=1, hAlign='LEFT')
    category_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d6d3d1')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(category_table)
    story.extend([
        Spacer(1, 5 * mm),
        Paragraph('Balance-as-of date: ' + user_local_date(user).isoformat(), styles['Normal']),
        Paragraph('Generated by ApnaWallet.', styles['Normal']),
    ])

    doc.build(story)
    buffer.seek(0)
    filename = f'apnawallet-report-{report["date_from"]}-to-{report["date_to"]}.pdf'
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
