from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from .models import Category, FinancialAccount, Transaction

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
