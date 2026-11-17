from decimal import Decimal
import calendar
from datetime import timedelta
from zoneinfo import ZoneInfo
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from .models import (
    Category,
    CreditRecord,
    CreditRepayment,
    CreditStatus,
    FinancialAccount,
    LendingAdjustment,
    LendingRecord,
    LendingRepayment,
    LendingStatus,
    Investment,
    InvestmentSale,
    SavingsDeposit,
    SavingsGoal,
    SavingsWithdrawal,
    MonthlyBudget,
    RecurringExpenseOccurrence,
    RecurringExpenseTemplate,
    Notification,
    Transaction,
)

DEFAULT_CATEGORIES = [
    {'name': 'Food', 'icon': 'Utensils', 'color': '#F97316'},
    {'name': 'Transport', 'icon': 'Car', 'color': '#3B82F6'},
    {'name': 'Shopping', 'icon': 'ShoppingBag', 'color': '#EC4899'},
    {'name': 'Bills', 'icon': 'Receipt', 'color': '#EAB308'},
    {'name': 'Health', 'icon': 'HeartPulse', 'color': '#EF4444'},
    {'name': 'Education', 'icon': 'GraduationCap', 'color': '#8B5CF6'},
    {'name': 'Other', 'icon': 'MoreHorizontal', 'color': '#64748B'},
]


def seed_default_categories():
    """
    Ensures baseline system categories exist in the database (user=None).
    """
    for cat in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            user=None,
            name=cat['name'],
            defaults={'icon': cat['icon'], 'color': cat['color'], 'is_active': True}
        )


def user_local_date(user):
    try:
        user_timezone = ZoneInfo(user.timezone_name)
    except (AttributeError, ValueError):
        user_timezone = ZoneInfo('UTC')
    return timezone.localtime(timezone.now(), user_timezone).date()


def _get_or_create_notification(user, identity_key, defaults):
    try:
        with transaction.atomic():
            notification, _ = Notification.objects.get_or_create(
                user=user, identity_key=identity_key, defaults=defaults
            )
    except IntegrityError:
        notification = Notification.objects.get(user=user, identity_key=identity_key)
    for field in ['title', 'message', 'related_id', 'due_date', 'amount']:
        value = defaults.get(field)
        if getattr(notification, field) != value:
            setattr(notification, field, value)
    notification.save(update_fields=['title', 'message', 'related_id', 'due_date', 'amount', 'updated_at'])
    return notification


def generate_notifications(user, upcoming_days=3):
    today = user_local_date(user)
    notifications = []
    daily_key = f'daily-expense:{today.isoformat()}'
    notifications.append(_get_or_create_notification(user, daily_key, {
        'kind': Notification.Kind.DAILY_EXPENSE,
        'title': "Today's expense update, please!",
        'message': 'Review or record today\'s expenses.',
        'related_id': None,
        'due_date': today,
        'amount': None,
    }))

    latest_due = today + timedelta(days=upcoming_days)
    credits = CreditRecord.objects.filter(
        user=user, outstanding_amount__gt=Decimal('0.00'),
        status__in=[CreditStatus.UNPAID, CreditStatus.PARTIALLY_PAID],
        pay_by_date__isnull=False, pay_by_date__lte=latest_due
    )
    for credit in credits:
        key = f'credit-payment:{credit.pk}:{credit.pay_by_date.isoformat()}'
        if credit.pay_by_date < today:
            state = 'overdue'
        elif credit.pay_by_date == today:
            state = 'due today'
        else:
            state = 'upcoming'
        notifications.append(_get_or_create_notification(user, key, {
            'kind': Notification.Kind.CREDIT_PAYMENT,
            'title': f'Credit payment {state}',
            'message': f'{credit.creditor_name}: ₹{credit.outstanding_amount:.2f} due {credit.pay_by_date}.',
            'related_id': credit.pk,
            'due_date': credit.pay_by_date,
            'amount': credit.outstanding_amount,
        }))

    recurring = RecurringExpenseTemplate.objects.filter(
        user=user, enabled=True, deleted_at__isnull=True, next_due_date__lte=latest_due
    ).select_related('category')
    for template in recurring:
        if RecurringExpenseOccurrence.objects.filter(
            template=template, scheduled_date=template.next_due_date
        ).exists():
            continue
        if template.next_due_date < today:
            state = 'overdue'
        elif template.next_due_date == today:
            state = 'due today'
        else:
            state = 'upcoming'
        key = f'recurring-expense:{template.pk}:{template.next_due_date.isoformat()}'
        notifications.append(_get_or_create_notification(user, key, {
            'kind': Notification.Kind.RECURRING_EXPENSE,
            'title': f'Recurring expense {state}',
            'message': f'{template.name}: ₹{template.amount:.2f} due {template.next_due_date}.',
            'related_id': template.pk,
            'due_date': template.next_due_date,
            'amount': template.amount,
        }))
    return notifications, today


def advance_recurring_date(current_date, frequency):
    if frequency == RecurringExpenseTemplate.Frequency.DAILY:
        return current_date + timedelta(days=1)
    if frequency == RecurringExpenseTemplate.Frequency.WEEKLY:
        return current_date + timedelta(days=7)
    if frequency == RecurringExpenseTemplate.Frequency.YEARLY:
        year = current_date.year + 1
        return current_date.replace(year=year, day=min(current_date.day, calendar.monthrange(year, current_date.month)[1]))
    year = current_date.year + (1 if current_date.month == 12 else 0)
    month = 1 if current_date.month == 12 else current_date.month + 1
    return current_date.replace(year=year, month=month, day=min(current_date.day, calendar.monthrange(year, month)[1]))


@transaction.atomic
def execute_record_recurring_expense(template_id, user, scheduled_date=None):
    template = RecurringExpenseTemplate.objects.select_for_update().select_related('account').get(
        pk=template_id, user=user, deleted_at__isnull=True
    )
    if not template.enabled:
        raise ValidationError("This recurring expense is disabled.")
    occurrence_date = scheduled_date or template.next_due_date
    if occurrence_date != template.next_due_date:
        raise ValidationError("The scheduled date does not match the next due occurrence.")
    if template.end_date and occurrence_date > template.end_date:
        raise ValidationError("This recurring expense has passed its end date.")
    if RecurringExpenseOccurrence.objects.filter(template=template, scheduled_date=occurrence_date).exists():
        raise ValidationError("This scheduled occurrence has already been recorded.")

    txn, locked_account = execute_expense(
        account=template.account,
        amount=template.amount,
        source_balance_type=template.balance_type,
        note=template.note,
        date=occurrence_date,
        category=template.category
    )
    occurrence = RecurringExpenseOccurrence.objects.create(
        template=template, scheduled_date=occurrence_date, transaction=txn
    )
    next_date = advance_recurring_date(occurrence_date, template.frequency)
    template.next_due_date = next_date
    if template.end_date and next_date > template.end_date:
        template.enabled = False
    template.save(update_fields=['next_due_date', 'enabled', 'updated_at'])
    return occurrence, template, txn, locked_account


def _debit_account(account, amount, balance_type):
    available = account.cash_balance if balance_type == Transaction.BalanceType.CASH else account.bank_balance
    if available < amount:
        raise ValidationError(f"Insufficient funds in {balance_type} balance. Available: ₹{available}, requested: ₹{amount}.")
    if balance_type == Transaction.BalanceType.CASH:
        account.cash_balance -= amount
    else:
        account.bank_balance -= amount


def _credit_account(account, amount, balance_type):
    if balance_type == Transaction.BalanceType.CASH:
        account.cash_balance += amount
    else:
        account.bank_balance += amount


@transaction.atomic
def execute_savings_goal(user, account, name, target_amount, target_date=None):
    if SavingsGoal.objects.select_for_update().filter(user=user, status=SavingsGoal.Status.ACTIVE).exists():
        raise ValidationError("You already have an active savings goal.")
    if not name.strip():
        raise ValidationError("Goal name is required.")
    goal = SavingsGoal.objects.create(user=user, account=account, name=name.strip(), target_amount=target_amount, target_date=target_date)
    return goal


@transaction.atomic
def execute_savings_deposit(goal_id, user, amount, source_balance_type, date=None):
    if amount <= Decimal('0.00'):
        raise ValidationError("Amount must be greater than zero.")
    goal = SavingsGoal.objects.select_for_update().get(pk=goal_id, user=user)
    if goal.status != SavingsGoal.Status.ACTIVE:
        raise ValidationError("Only an active savings goal can receive deposits.")
    locked_account = FinancialAccount.objects.select_for_update().get(pk=goal.account_id, user=user)
    _debit_account(locked_account, amount, source_balance_type)
    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])
    txn = Transaction.objects.create(account=locked_account, transaction_type=Transaction.TransactionType.SAVINGS_ALLOCATION,
        amount=amount, balance_type=source_balance_type, note=f"Savings deposit: {goal.name}", date=date or timezone.now().date())
    deposit = SavingsDeposit.objects.create(goal=goal, amount=amount, source_balance_type=source_balance_type, transaction=txn)
    goal.saved_amount += amount
    if goal.saved_amount >= goal.target_amount:
        goal.saved_amount = goal.target_amount
        goal.status = SavingsGoal.Status.COMPLETED
    goal.save(update_fields=['saved_amount', 'status', 'updated_at'])
    return deposit, goal, txn, locked_account


@transaction.atomic
def execute_savings_withdrawal(goal_id, user, amount, destination_balance_type, date=None):
    if amount <= Decimal('0.00'):
        raise ValidationError("Amount must be greater than zero.")
    goal = SavingsGoal.objects.select_for_update().get(pk=goal_id, user=user)
    if amount > goal.saved_amount:
        raise ValidationError(f"Insufficient saved funds. Available: ₹{goal.saved_amount}.")
    locked_account = FinancialAccount.objects.select_for_update().get(pk=goal.account_id, user=user)
    _credit_account(locked_account, amount, destination_balance_type)
    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])
    txn = Transaction.objects.create(account=locked_account, transaction_type=Transaction.TransactionType.SAVINGS_WITHDRAWAL,
        amount=amount, balance_type=destination_balance_type, note=f"Savings withdrawal: {goal.name}", date=date or timezone.now().date())
    withdrawal = SavingsWithdrawal.objects.create(goal=goal, amount=amount, destination_balance_type=destination_balance_type, transaction=txn)
    goal.saved_amount -= amount
    if goal.status == SavingsGoal.Status.COMPLETED:
        goal.status = SavingsGoal.Status.ACTIVE
    goal.save(update_fields=['saved_amount', 'status', 'updated_at'])
    return withdrawal, goal, txn, locked_account


@transaction.atomic
def execute_goal_action(goal_id, user, action, destination_balance_type=None):
    goal = SavingsGoal.objects.select_for_update().get(pk=goal_id, user=user)
    if goal.status != SavingsGoal.Status.ACTIVE:
        raise ValidationError("Only an active goal can be completed or cancelled.")
    if action == 'complete':
        if goal.saved_amount < goal.target_amount:
            raise ValidationError("A goal can only be completed after reaching its target.")
        goal.status = SavingsGoal.Status.COMPLETED
    else:
        if goal.saved_amount and destination_balance_type in [Transaction.BalanceType.CASH, Transaction.BalanceType.BANK]:
            locked_account = FinancialAccount.objects.select_for_update().get(pk=goal.account_id, user=user)
            _credit_account(locked_account, goal.saved_amount, destination_balance_type)
            locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])
            txn = Transaction.objects.create(account=locked_account, transaction_type=Transaction.TransactionType.SAVINGS_WITHDRAWAL,
                amount=goal.saved_amount, balance_type=destination_balance_type, note=f"Savings cancellation: {goal.name}")
            SavingsWithdrawal.objects.create(goal=goal, amount=goal.saved_amount,
                destination_balance_type=destination_balance_type, transaction=txn)
            goal.saved_amount = Decimal('0.00')
        goal.status = SavingsGoal.Status.CANCELLED
    goal.save(update_fields=['status', 'saved_amount', 'updated_at'])
    return goal


@transaction.atomic
def execute_investment_purchase(user, account, name, investment_type, amount, platform, purchase_date=None, note='',
                                balance_type=Transaction.BalanceType.BANK):
    if amount <= Decimal('0.00'):
        raise ValidationError("Investment amount must be greater than zero.")
    locked_account = FinancialAccount.objects.select_for_update().get(pk=account.pk, user=user)
    _debit_account(locked_account, amount, balance_type)
    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])
    txn = Transaction.objects.create(account=locked_account, transaction_type=Transaction.TransactionType.INVESTMENT_PURCHASE,
        amount=amount, balance_type=balance_type, note=f"Investment purchase: {name.strip()}", date=purchase_date or timezone.now().date())
    investment = Investment.objects.create(user=user, account=locked_account, name=name.strip(), investment_type=investment_type,
        cost_basis=amount, platform=platform.strip(), purchase_date=purchase_date or timezone.now().date(), note=note.strip())
    return investment, txn, locked_account


@transaction.atomic
def execute_investment_sale(investment_id, user, cost_basis_sold, proceeds, destination_balance_type, sale_date=None, note=''):
    investment = Investment.objects.select_for_update().get(pk=investment_id, user=user)
    if cost_basis_sold <= Decimal('0.00') or proceeds < Decimal('0.00'):
        raise ValidationError("Sale amounts are invalid.")
    if investment.is_closed or cost_basis_sold > investment.cost_basis:
        raise ValidationError("Sale cost basis exceeds the remaining investment.")
    locked_account = FinancialAccount.objects.select_for_update().get(pk=investment.account_id, user=user)
    _credit_account(locked_account, proceeds, destination_balance_type)
    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])
    txn = Transaction.objects.create(account=locked_account, transaction_type=Transaction.TransactionType.INVESTMENT_SALE,
        amount=proceeds, balance_type=destination_balance_type, note=f"Investment sale: {investment.name}", date=sale_date or timezone.now().date())
    sale = InvestmentSale.objects.create(investment=investment, cost_basis_sold=cost_basis_sold, proceeds=proceeds,
        realized_gain_loss=proceeds - cost_basis_sold, destination_balance_type=destination_balance_type,
        sale_date=sale_date or timezone.now().date(), note=note.strip(), transaction=txn)
    investment.cost_basis -= cost_basis_sold
    investment.is_closed = investment.cost_basis == Decimal('0.00')
    investment.save(update_fields=['cost_basis', 'is_closed', 'updated_at'])
    return sale, investment, txn, locked_account


@transaction.atomic
def execute_add_cash(account, amount, destination_balance_type, note, date=None, category=None):
    """
    Atomic Add Cash execution.
    Locks the FinancialAccount row, increments the chosen balance, and records the transaction.
    """
    if amount <= Decimal('0.00'):
        raise ValidationError("Amount must be greater than zero.")

    if not note or len(note.strip()) < 3:
        raise ValidationError("Note/Description must contain at least 3 characters.")

    if destination_balance_type not in [Transaction.BalanceType.CASH, Transaction.BalanceType.BANK]:
        raise ValidationError("Invalid destination balance type. Must be CASH or BANK.")

    # Concurrency safe row-locking
    locked_account = FinancialAccount.objects.select_for_update().get(pk=account.pk)

    if destination_balance_type == Transaction.BalanceType.CASH:
        locked_account.cash_balance += amount
    else:
        locked_account.bank_balance += amount

    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])

    txn = Transaction.objects.create(
        account=locked_account,
        transaction_type=Transaction.TransactionType.ADD_CASH,
        amount=amount,
        balance_type=destination_balance_type,
        note=note.strip(),
        date=date or timezone.now().date(),
        category=category
    )
    return txn, locked_account


@transaction.atomic
def execute_expense(account, amount, source_balance_type, note, date=None, category=None):
    """
    Atomic Expense execution.
    Checks for sufficient funds, deducts from selected balance, and writes to the transaction ledger.
    """
    if amount <= Decimal('0.00'):
        raise ValidationError("Amount must be greater than zero.")

    if not note or len(note.strip()) < 3:
        raise ValidationError("Note must contain at least 3 characters.")

    if source_balance_type not in [Transaction.BalanceType.CASH, Transaction.BalanceType.BANK]:
        raise ValidationError("Invalid payment source. Must be CASH or BANK.")

    # Concurrency safe row-locking
    locked_account = FinancialAccount.objects.select_for_update().get(pk=account.pk)

    available = locked_account.cash_balance if source_balance_type == Transaction.BalanceType.CASH else locked_account.bank_balance

    if available < amount:
        raise ValidationError(
            f"Insufficient funds in {source_balance_type} balance. Available: ₹{available}, requested: ₹{amount}."
        )

    if source_balance_type == Transaction.BalanceType.CASH:
        locked_account.cash_balance -= amount
    else:
        locked_account.bank_balance -= amount

    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])

    txn = Transaction.objects.create(
        account=locked_account,
        transaction_type=Transaction.TransactionType.EXPENSE,
        amount=amount,
        balance_type=source_balance_type,
        note=note.strip(),
        date=date or timezone.now().date(),
        category=category
    )
    return txn, locked_account


@transaction.atomic
def execute_transfer(account, amount, source_balance_type, destination_balance_type, note, date=None):
    """
    Atomic Transfer execution.
    Moves funds between Cash and Bank within the same Financial Account.
    Preserves Total Available Balance while updating balances atomically.
    """
    if amount <= Decimal('0.00'):
        raise ValidationError("Amount must be greater than zero.")

    if source_balance_type == destination_balance_type:
        raise ValidationError("Source and destination balance types must be different.")

    if not note or len(note.strip()) < 3:
        raise ValidationError("Transfer note must contain at least 3 characters.")

    # Concurrency safe row-locking
    locked_account = FinancialAccount.objects.select_for_update().get(pk=account.pk)

    available = locked_account.cash_balance if source_balance_type == Transaction.BalanceType.CASH else locked_account.bank_balance

    if available < amount:
        raise ValidationError(
            f"Insufficient funds in {source_balance_type} balance to transfer ₹{amount}. Available: ₹{available}."
        )

    if source_balance_type == Transaction.BalanceType.CASH:
        locked_account.cash_balance -= amount
        locked_account.bank_balance += amount
    else:
        locked_account.bank_balance -= amount
        locked_account.cash_balance += amount

    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])

    txn = Transaction.objects.create(
        account=locked_account,
        transaction_type=Transaction.TransactionType.TRANSFER,
        amount=amount,
        balance_type=source_balance_type,
        destination_balance_type=destination_balance_type,
        note=note.strip(),
        date=date or timezone.now().date()
    )
    return txn, locked_account


@transaction.atomic
def update_expense(transaction_id, user, new_amount=None, new_category=None, new_note=None, new_date=None, new_balance_type=None):
    """
    Atomic expense editing with differential balance adjustment.
    Example: Editing ₹200 to ₹300 on CASH deducts an extra ₹100, checking for sufficient funds.
    """
    txn = Transaction.objects.select_for_update().get(
        pk=transaction_id,
        account__user=user,
        transaction_type=Transaction.TransactionType.EXPENSE,
        is_voided=False
    )
    locked_account = FinancialAccount.objects.select_for_update().get(pk=txn.account.pk)

    orig_amount = txn.amount
    orig_balance_type = txn.balance_type

    target_amount = new_amount if new_amount is not None else orig_amount
    target_balance_type = new_balance_type if new_balance_type is not None else orig_balance_type

    if target_amount <= Decimal('0.00'):
        raise ValidationError("Amount must be greater than zero.")

    if new_note is not None and len(new_note.strip()) < 3:
        raise ValidationError("Note must contain at least 3 characters.")

    # Step 1: Temporarily reverse previous deduction
    if orig_balance_type == Transaction.BalanceType.CASH:
        locked_account.cash_balance += orig_amount
    else:
        locked_account.bank_balance += orig_amount

    # Step 2: Validate available funds on target balance
    available = locked_account.cash_balance if target_balance_type == Transaction.BalanceType.CASH else locked_account.bank_balance
    if available < target_amount:
        raise ValidationError(
            f"Insufficient funds in {target_balance_type} balance. Available after reversal: ₹{available}, required: ₹{target_amount}."
        )

    # Step 3: Apply new deduction
    if target_balance_type == Transaction.BalanceType.CASH:
        locked_account.cash_balance -= target_amount
    else:
        locked_account.bank_balance -= target_amount

    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])

    # Step 4: Update transaction
    txn.amount = target_amount
    txn.balance_type = target_balance_type
    if new_category is not None:
        txn.category = new_category
    if new_note is not None:
        txn.note = new_note.strip()
    if new_date is not None:
        txn.date = new_date

    txn.save()
    return txn, locked_account


@transaction.atomic
def void_transaction(transaction_id, user):
    """
    Safe financial reversal (voiding) that preserves audit trail history while restoring balances.
    """
    txn = Transaction.objects.select_for_update().get(
        pk=transaction_id,
        account__user=user,
        is_voided=False
    )
    locked_account = FinancialAccount.objects.select_for_update().get(pk=txn.account.pk)

    if txn.transaction_type == Transaction.TransactionType.ADD_CASH:
        # Reversing Add Cash requires deducting the money added
        available = locked_account.cash_balance if txn.balance_type == Transaction.BalanceType.CASH else locked_account.bank_balance
        if available < txn.amount:
            raise ValidationError(
                f"Cannot void transaction: {txn.balance_type} balance would become negative (Available: ₹{available}, deduction: ₹{txn.amount})."
            )
        if txn.balance_type == Transaction.BalanceType.CASH:
            locked_account.cash_balance -= txn.amount
        else:
            locked_account.bank_balance -= txn.amount

    elif txn.transaction_type == Transaction.TransactionType.EXPENSE:
        # Reversing Expense restores money back to balance
        if txn.balance_type == Transaction.BalanceType.CASH:
            locked_account.cash_balance += txn.amount
        else:
            locked_account.bank_balance += txn.amount

    elif txn.transaction_type == Transaction.TransactionType.TRANSFER:
        # Reversing Transfer: deduct from destination, restore to source
        dest_available = locked_account.cash_balance if txn.destination_balance_type == Transaction.BalanceType.CASH else locked_account.bank_balance
        if dest_available < txn.amount:
            raise ValidationError(
                f"Cannot void transfer: {txn.destination_balance_type} balance would become negative."
            )
        # Restore source
        if txn.balance_type == Transaction.BalanceType.CASH:
            locked_account.cash_balance += txn.amount
        else:
            locked_account.bank_balance += txn.amount
        # Deduct destination
        if txn.destination_balance_type == Transaction.BalanceType.CASH:
            locked_account.cash_balance -= txn.amount
        else:
            locked_account.bank_balance -= txn.amount

    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])
    txn.is_voided = True
    txn.save(update_fields=['is_voided', 'updated_at'])

    return txn, locked_account


# ==============================================================================
# LENDING OPERATIONS (Prompt 05)
# ==============================================================================

@transaction.atomic
def execute_lend(account, borrower_name, amount, source_balance_type, date=None, note=''):
    """
    Atomic Lend Money execution.
    1. Validates input (positive amount, non-empty borrower name).
    2. Locks FinancialAccount row using select_for_update().
    3. Checks sufficient funds in chosen balance (Cash or Bank).
    4. Deducts amount from chosen balance.
    5. Creates LendingRecord (receivable asset).
    6. Writes transaction to ledger with transaction_type=LENDING.
    """
    if amount <= Decimal('0.00'):
        raise ValidationError("Lending amount must be greater than zero.")

    if not borrower_name or not borrower_name.strip():
        raise ValidationError("Borrower name is mandatory.")

    if source_balance_type not in [Transaction.BalanceType.CASH, Transaction.BalanceType.BANK]:
        raise ValidationError("Invalid payment source. Must be CASH or BANK.")

    # Concurrency safe row-locking
    locked_account = FinancialAccount.objects.select_for_update().get(pk=account.pk)

    available = locked_account.cash_balance if source_balance_type == Transaction.BalanceType.CASH else locked_account.bank_balance
    if available < amount:
        raise ValidationError(
            f"Insufficient funds in {source_balance_type} balance. Available: ₹{available}, requested: ₹{amount}."
        )

    if source_balance_type == Transaction.BalanceType.CASH:
        locked_account.cash_balance -= amount
    else:
        locked_account.bank_balance -= amount

    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])

    clean_borrower = borrower_name.strip()
    lending_record = LendingRecord.objects.create(
        user=locked_account.user,
        account=locked_account,
        borrower_name=clean_borrower,
        original_amount=amount,
        outstanding_amount=amount,
        amount_repaid=Decimal('0.00'),
        lending_date=date or timezone.now().date(),
        notes=note.strip() if note else '',
        status=LendingStatus.UNPAID
    )

    ledger_note = f"Lent to {clean_borrower}" + (f": {note.strip()}" if note and note.strip() else "")
    txn = Transaction.objects.create(
        account=locked_account,
        transaction_type=Transaction.TransactionType.LENDING,
        amount=amount,
        balance_type=source_balance_type,
        note=ledger_note,
        date=date or timezone.now().date()
    )

    return lending_record, txn, locked_account


@transaction.atomic
def execute_lending_repayment(lending_id, user, amount, destination_balance_type, repayment_date=None, note=''):
    """
    Atomic Lending Repayment execution.
    1. Locks LendingRecord and FinancialAccount.
    2. Validates user ownership and non-negative amount.
    3. Validates that repayment does not exceed remaining outstanding amount.
    4. Credits Cash or Bank balance (recovering principal is NOT income).
    5. Decrements outstanding_amount and updates status (FULLY_PAID / PARTIALLY_PAID).
    6. Creates LendingRepayment record.
    7. Records Transaction in ledger. Auto-generated note: e.g. "Ranjan paid ₹300".
    """
    if amount <= Decimal('0.00'):
        raise ValidationError("Repayment amount must be greater than zero.")

    if destination_balance_type not in [Transaction.BalanceType.CASH, Transaction.BalanceType.BANK]:
        raise ValidationError("Invalid destination balance. Must be CASH or BANK.")

    # Concurrency safe row-locking
    lending = LendingRecord.objects.select_for_update().get(pk=lending_id, user=user)

    if amount > lending.outstanding_amount:
        raise ValidationError(
            f"Repayment amount (₹{amount}) cannot exceed the outstanding amount (₹{lending.outstanding_amount})."
        )

    locked_account = FinancialAccount.objects.select_for_update().get(pk=lending.account_id)

    if destination_balance_type == Transaction.BalanceType.CASH:
        locked_account.cash_balance += amount
    else:
        locked_account.bank_balance += amount

    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])

    lending.outstanding_amount -= amount
    lending.amount_repaid += amount
    if lending.outstanding_amount == Decimal('0.00'):
        lending.status = LendingStatus.FULLY_PAID
    else:
        lending.status = LendingStatus.PARTIALLY_PAID
    lending.save(update_fields=['outstanding_amount', 'amount_repaid', 'status', 'updated_at'])

    # Format automatic note per STQA LEND-09: "Ranjan paid ₹300"
    if not note or not note.strip():
        formatted_amt = f"{int(amount)}" if amount % 1 == 0 else f"{amount}"
        txn_note = f"{lending.borrower_name} paid ₹{formatted_amt}"
    else:
        txn_note = note.strip()

    txn = Transaction.objects.create(
        account=locked_account,
        transaction_type=Transaction.TransactionType.LENDING_REPAYMENT,
        amount=amount,
        balance_type=destination_balance_type,
        note=txn_note,
        date=repayment_date or timezone.now().date()
    )

    repayment = LendingRepayment.objects.create(
        lending=lending,
        amount=amount,
        balance_type=destination_balance_type,
        repayment_date=repayment_date or timezone.now().date(),
        note=txn_note,
        transaction=txn
    )

    return repayment, lending, txn, locked_account


@transaction.atomic
def execute_lending_adjustment(lending_id, user, new_outstanding_amount, reason):
    """
    Adjusts a lending outstanding amount manually (e.g. debt reduction, settlement).
    CRITICAL: Does NOT touch Cash or Bank balance! Reducing debt is not cash inflow.
    Preserves audit history via LendingAdjustment.
    """
    if not reason or len(reason.strip()) < 3:
        raise ValidationError("A clear reason (at least 3 characters) is required for financial adjustments.")

    lending = LendingRecord.objects.select_for_update().get(pk=lending_id, user=user)

    if new_outstanding_amount < Decimal('0.00'):
        raise ValidationError("Outstanding amount cannot be negative.")

    if new_outstanding_amount > lending.original_amount:
        raise ValidationError("Outstanding amount cannot exceed the original lent amount.")

    prev_outstanding = lending.outstanding_amount
    delta = new_outstanding_amount - prev_outstanding

    if delta == Decimal('0.00'):
        raise ValidationError("New outstanding amount is identical to current amount. No adjustment made.")

    lending.outstanding_amount = new_outstanding_amount
    if new_outstanding_amount == Decimal('0.00'):
        lending.status = LendingStatus.FULLY_PAID
    elif new_outstanding_amount < lending.original_amount:
        lending.status = LendingStatus.PARTIALLY_PAID
    else:
        lending.status = LendingStatus.UNPAID

    lending.save(update_fields=['outstanding_amount', 'status', 'updated_at'])

    adjustment = LendingAdjustment.objects.create(
        lending=lending,
        adjustment_amount=delta,
        reason=reason.strip(),
        previous_outstanding=prev_outstanding,
        new_outstanding=new_outstanding_amount
    )

    return adjustment, lending


def update_lending_metadata(lending_id, user, borrower_name=None, notes=None):
    """
    Updates non-financial metadata (borrower name, notes) without altering balances.
    """
    lending = LendingRecord.objects.get(pk=lending_id, user=user)
    updated_fields = []

    if borrower_name is not None and borrower_name.strip():
        lending.borrower_name = borrower_name.strip()
        updated_fields.append('borrower_name')

    if notes is not None:
        lending.notes = notes.strip()
        updated_fields.append('notes')

    if updated_fields:
        updated_fields.append('updated_at')
        lending.save(update_fields=updated_fields)

    return lending


# ==============================================================================
# CREDIT OPERATIONS (Prompt 05)
# ==============================================================================

@transaction.atomic
def execute_create_credit(
    account,
    creditor_name,
    amount,
    credit_date=None,
    pay_by_date=None,
    description='',
    receive_funds=False,
    destination_balance_type=None
):
    """
    Atomic Credit Record creation.
    Supports two distinct flows:
      A. receive_funds=False: Records existing debt/liability without changing Cash/Bank.
      B. receive_funds=True: Receiving borrowed money into Cash or Bank (creates liability + increases balance).
    Borrowed money is NOT earned income.
    """
    if amount <= Decimal('0.00'):
        raise ValidationError("Credit amount must be greater than zero.")

    if not creditor_name or not creditor_name.strip():
        raise ValidationError("Creditor name is mandatory.")

    txn = None
    locked_account = None

    if receive_funds:
        if destination_balance_type not in [Transaction.BalanceType.CASH, Transaction.BalanceType.BANK]:
            raise ValidationError("Invalid destination balance. Must be CASH or BANK when receiving borrowed funds.")

        locked_account = FinancialAccount.objects.select_for_update().get(pk=account.pk)

        if destination_balance_type == Transaction.BalanceType.CASH:
            locked_account.cash_balance += amount
        else:
            locked_account.bank_balance += amount

        locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])

        ledger_note = f"Borrowed from {creditor_name.strip()}" + (f": {description.strip()}" if description else "")
        txn = Transaction.objects.create(
            account=locked_account,
            transaction_type=Transaction.TransactionType.CREDIT,
            amount=amount,
            balance_type=destination_balance_type,
            note=ledger_note,
            date=credit_date or timezone.now().date()
        )
    else:
        locked_account = account

    credit = CreditRecord.objects.create(
        user=locked_account.user,
        account=locked_account,
        creditor_name=creditor_name.strip(),
        original_amount=amount,
        outstanding_amount=amount,
        amount_repaid=Decimal('0.00'),
        credit_date=credit_date or timezone.now().date(),
        pay_by_date=pay_by_date,
        description=description.strip() if description else '',
        funds_received=receive_funds,
        received_balance_type=destination_balance_type if receive_funds else None,
        status=CreditStatus.UNPAID
    )

    return credit, txn, locked_account


@transaction.atomic
def execute_credit_repayment(credit_id, user, amount, payment_source, repayment_date=None, note=''):
    """
    Atomic Credit Repayment execution.
    1. Locks CreditRecord and FinancialAccount.
    2. Validates amount and sufficient funds in Cash or Bank.
    3. Prevents repayment exceeding outstanding debt.
    4. Deducts amount from Cash or Bank.
    5. Decrements outstanding_amount and updates status.
    6. Writes transaction to ledger with transaction_type=CREDIT_REPAYMENT.
    """
    if amount <= Decimal('0.00'):
        raise ValidationError("Repayment amount must be greater than zero.")

    if payment_source not in [Transaction.BalanceType.CASH, Transaction.BalanceType.BANK]:
        raise ValidationError("Invalid payment source. Must be CASH or BANK.")

    credit = CreditRecord.objects.select_for_update().get(pk=credit_id, user=user)

    if amount > credit.outstanding_amount:
        raise ValidationError(
            f"Repayment amount (₹{amount}) cannot exceed the outstanding debt (₹{credit.outstanding_amount})."
        )

    locked_account = FinancialAccount.objects.select_for_update().get(pk=credit.account_id)

    available = locked_account.cash_balance if payment_source == Transaction.BalanceType.CASH else locked_account.bank_balance
    if available < amount:
        raise ValidationError(
            f"Insufficient funds in {payment_source} balance. Available: ₹{available}, required: ₹{amount}."
        )

    if payment_source == Transaction.BalanceType.CASH:
        locked_account.cash_balance -= amount
    else:
        locked_account.bank_balance -= amount

    locked_account.save(update_fields=['cash_balance', 'bank_balance', 'updated_at'])

    credit.outstanding_amount -= amount
    credit.amount_repaid += amount
    if credit.outstanding_amount == Decimal('0.00'):
        credit.status = CreditStatus.FULLY_PAID
    else:
        credit.status = CreditStatus.PARTIALLY_PAID
    credit.save(update_fields=['outstanding_amount', 'amount_repaid', 'status', 'updated_at'])

    txn_note = note.strip() if note and note.strip() else f"Repayment to {credit.creditor_name}"
    txn = Transaction.objects.create(
        account=locked_account,
        transaction_type=Transaction.TransactionType.CREDIT_REPAYMENT,
        amount=amount,
        balance_type=payment_source,
        note=txn_note,
        date=repayment_date or timezone.now().date()
    )

    repayment = CreditRepayment.objects.create(
        credit=credit,
        amount=amount,
        payment_source=payment_source,
        repayment_date=repayment_date or timezone.now().date(),
        note=txn_note,
        transaction=txn
    )

    return repayment, credit, txn, locked_account


def update_credit_metadata(credit_id, user, creditor_name=None, description=None, pay_by_date=None, clear_due_date=False):
    """
    Updates non-financial metadata (creditor name, description) and optional due date.
    """
    credit = CreditRecord.objects.get(pk=credit_id, user=user)
    updated_fields = []

    if creditor_name is not None and creditor_name.strip():
        credit.creditor_name = creditor_name.strip()
        updated_fields.append('creditor_name')

    if description is not None:
        credit.description = description.strip()
        updated_fields.append('description')

    if clear_due_date:
        credit.pay_by_date = None
        updated_fields.append('pay_by_date')
    elif pay_by_date is not None:
        credit.pay_by_date = pay_by_date
        updated_fields.append('pay_by_date')

    if updated_fields:
        updated_fields.append('updated_at')
        credit.save(update_fields=updated_fields)

    return credit
