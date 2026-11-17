import uuid
from decimal import Decimal
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """
    Custom manager for ApnaWallet User where email is the unique identifier.
    """
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field is mandatory for registration.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            raise ValueError('A password is required.')
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for ApnaWallet using UUID and Email.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class FinancialAccount(models.Model):
    """
    Financial Account belonging to a User.
    Default account is 'Personal' created automatically on user registration.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='financial_accounts',
        db_index=True
    )
    name = models.CharField(max_length=64, default='Personal')
    is_default = models.BooleanField(default=True)
    currency = models.CharField(max_length=3, default='INR')
    cash_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    bank_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', 'name']
        constraints = [
            models.UniqueConstraint(fields=['user', 'name'], name='unique_account_name_per_user')
        ]

    @property
    def total_balance(self):
        return self.cash_balance + self.bank_balance

    def __str__(self):
        return f"{self.name} ({self.user.email})"


class Category(models.Model):
    """
    Expense or Income Category.
    If user is NULL, it is a system-wide default category.
    If user is set, it is a custom category created by that user.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='custom_categories',
        null=True,
        blank=True,
        db_index=True
    )
    name = models.CharField(max_length=64)
    icon = models.CharField(max_length=32, default='Tag')
    color = models.CharField(max_length=32, default='#FF6B00')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Transaction(models.Model):
    """
    Authoritative Financial Transaction Ledger.
    Tracks all money additions, expenses, and internal transfers.
    """
    class TransactionType(models.TextChoices):
        ADD_CASH = 'ADD_CASH', 'Add Cash'
        EXPENSE = 'EXPENSE', 'Expense'
        TRANSFER = 'TRANSFER', 'Transfer'
        # Prepared for future modules:
        LENDING = 'LENDING', 'Lending'
        LENDING_REPAYMENT = 'LENDING_REPAYMENT', 'Lending Repayment'
        CREDIT = 'CREDIT', 'Credit'
        CREDIT_REPAYMENT = 'CREDIT_REPAYMENT', 'Credit Repayment'
        SAVINGS_ALLOCATION = 'SAVINGS_ALLOCATION', 'Savings Allocation'
        SAVINGS_WITHDRAWAL = 'SAVINGS_WITHDRAWAL', 'Savings Withdrawal'
        INVESTMENT_PURCHASE = 'INVESTMENT_PURCHASE', 'Investment Purchase'
        INVESTMENT_SALE = 'INVESTMENT_SALE', 'Investment Sale'

    class BalanceType(models.TextChoices):
        CASH = 'CASH', 'Cash'
        BANK = 'BANK', 'Bank'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.CASCADE,
        related_name='transactions',
        db_index=True
    )
    transaction_type = models.CharField(
        max_length=32,
        choices=TransactionType.choices,
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    balance_type = models.CharField(
        max_length=8,
        choices=BalanceType.choices,
        help_text="Primary balance (source for expense/transfer, destination for add cash)"
    )
    destination_balance_type = models.CharField(
        max_length=8,
        choices=BalanceType.choices,
        null=True,
        blank=True,
        help_text="Target balance (only for TRANSFER)"
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    note = models.CharField(
        max_length=255,
        help_text="Mandatory note of at least 3 characters"
    )
    date = models.DateField(default=timezone.now)
    is_voided = models.BooleanField(
        default=False,
        help_text="Soft-reversal / voiding for historical audit integrity"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.transaction_type} ₹{self.amount} - {self.note}"


class LendingStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Unpaid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    FULLY_PAID = 'FULLY_PAID', 'Fully Paid'


class LendingRecord(models.Model):
    """
    Lending Record tracking money lent to other individuals (receivable asset).
    Disbursement decreases Cash or Bank balance and creates an asset.
    Repayments restore Cash or Bank balance without counting as income.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='lendings',
        db_index=True
    )
    account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.CASCADE,
        related_name='lendings',
        db_index=True
    )
    borrower_name = models.CharField(max_length=120, db_index=True)
    original_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    outstanding_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    amount_repaid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    lending_date = models.DateField(default=timezone.now)
    notes = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=LendingStatus.choices,
        default=LendingStatus.UNPAID,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-lending_date', '-created_at']

    def __str__(self):
        return f"Lent to {self.borrower_name}: ₹{self.outstanding_amount} remaining of ₹{self.original_amount}"


class LendingRepayment(models.Model):
    """
    Repayment event for a LendingRecord.
    Tracks each partial or full repayment instance.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lending = models.ForeignKey(
        LendingRecord,
        on_delete=models.CASCADE,
        related_name='repayments',
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    balance_type = models.CharField(
        max_length=8,
        choices=Transaction.BalanceType.choices,
        help_text="Target balance (Cash or Bank) receiving the repayment"
    )
    repayment_date = models.DateField(default=timezone.now)
    note = models.CharField(max_length=255, blank=True, default='')
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lending_repayments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-repayment_date', '-created_at']

    def __str__(self):
        return f"Repayment of ₹{self.amount} for {self.lending.borrower_name}"


class LendingAdjustment(models.Model):
    """
    Financial adjustment on a LendingRecord (e.g. debt reduction, settlement, correction).
    Never creates or destroys Cash/Bank balances — only modifies receivables.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lending = models.ForeignKey(
        LendingRecord,
        on_delete=models.CASCADE,
        related_name='adjustments',
        db_index=True
    )
    adjustment_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Net change to outstanding amount (negative for reduction/forgiveness)"
    )
    reason = models.CharField(max_length=255)
    previous_outstanding = models.DecimalField(max_digits=12, decimal_places=2)
    new_outstanding = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Adjustment ₹{self.adjustment_amount} on {self.lending.borrower_name}: {self.reason}"


class CreditStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Unpaid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    FULLY_PAID = 'FULLY_PAID', 'Fully Paid'


class CreditRecord(models.Model):
    """
    Credit Record tracking money owed to creditors (liability).
    Supports:
      A. Recording existing liability without changing Cash/Bank.
      B. Receiving borrowed money into Cash or Bank (creates liability + increases balance).
    Repayments reduce Cash/Bank and extinguish the liability (not an expense).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='credits',
        db_index=True
    )
    account = models.ForeignKey(
        FinancialAccount,
        on_delete=models.CASCADE,
        related_name='credits',
        db_index=True
    )
    creditor_name = models.CharField(max_length=120, db_index=True)
    original_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    outstanding_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    amount_repaid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    credit_date = models.DateField(default=timezone.now)
    pay_by_date = models.DateField(null=True, blank=True, db_index=True)
    description = models.CharField(max_length=255, blank=True, default='')
    funds_received = models.BooleanField(
        default=False,
        help_text="True if borrowed money was deposited into Cash or Bank"
    )
    received_balance_type = models.CharField(
        max_length=8,
        choices=Transaction.BalanceType.choices,
        null=True,
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=CreditStatus.choices,
        default=CreditStatus.UNPAID,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-credit_date', '-created_at']

    @property
    def is_overdue(self):
        if self.pay_by_date and self.outstanding_amount > Decimal('0.00'):
            return self.pay_by_date < timezone.now().date()
        return False

    def __str__(self):
        return f"Owed to {self.creditor_name}: ₹{self.outstanding_amount} remaining of ₹{self.original_amount}"


class CreditRepayment(models.Model):
    """
    Repayment event for a CreditRecord.
    Deducts money from Cash or Bank and reduces liability.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    credit = models.ForeignKey(
        CreditRecord,
        on_delete=models.CASCADE,
        related_name='repayments',
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    payment_source = models.CharField(
        max_length=8,
        choices=Transaction.BalanceType.choices,
        help_text="Source balance (Cash or Bank) from which repayment was paid"
    )
    repayment_date = models.DateField(default=timezone.now)
    note = models.CharField(max_length=255, blank=True, default='')
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='credit_repayments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-repayment_date', '-created_at']

    def __str__(self):
        return f"Repayment of ₹{self.amount} to {self.credit.creditor_name}"


class SavingsGoal(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='savings_goals', db_index=True)
    account = models.ForeignKey(FinancialAccount, on_delete=models.CASCADE, related_name='savings_goals')
    name = models.CharField(max_length=120)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    saved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    target_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user'], condition=models.Q(status='ACTIVE'), name='one_active_savings_goal_per_user')
        ]

    @property
    def progress_percentage(self):
        if not self.target_amount:
            return Decimal('0.00')
        return min(Decimal('100.00'), (self.saved_amount / self.target_amount) * Decimal('100'))


class SavingsDeposit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(SavingsGoal, on_delete=models.PROTECT, related_name='deposits')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    source_balance_type = models.CharField(max_length=8, choices=Transaction.BalanceType.choices)
    transaction = models.ForeignKey(Transaction, on_delete=models.PROTECT, related_name='savings_deposits')
    created_at = models.DateTimeField(auto_now_add=True)


class SavingsWithdrawal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(SavingsGoal, on_delete=models.PROTECT, related_name='withdrawals')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    destination_balance_type = models.CharField(max_length=8, choices=Transaction.BalanceType.choices)
    transaction = models.ForeignKey(Transaction, on_delete=models.PROTECT, related_name='savings_withdrawals')
    created_at = models.DateTimeField(auto_now_add=True)


class Investment(models.Model):
    class InvestmentType(models.TextChoices):
        GOLD = 'GOLD', 'Gold'
        CRYPTO = 'CRYPTO', 'Crypto'
        STOCKS = 'STOCKS', 'Stocks'
        MUTUAL_FUNDS = 'MUTUAL_FUNDS', 'Mutual Funds'
        OTHER = 'OTHER', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='investments', db_index=True)
    account = models.ForeignKey(FinancialAccount, on_delete=models.CASCADE, related_name='investments')
    name = models.CharField(max_length=120)
    investment_type = models.CharField(max_length=20, choices=InvestmentType.choices)
    cost_basis = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    platform = models.CharField(max_length=120)
    purchase_date = models.DateField(default=timezone.now)
    note = models.CharField(max_length=255, blank=True, default='')
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-purchase_date', '-created_at']


class InvestmentSale(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    investment = models.ForeignKey(Investment, on_delete=models.PROTECT, related_name='sales')
    cost_basis_sold = models.DecimalField(max_digits=12, decimal_places=2)
    proceeds = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    realized_gain_loss = models.DecimalField(max_digits=12, decimal_places=2)
    destination_balance_type = models.CharField(max_length=8, choices=Transaction.BalanceType.choices)
    sale_date = models.DateField(default=timezone.now)
    note = models.CharField(max_length=255, blank=True, default='')
    transaction = models.ForeignKey(Transaction, on_delete=models.PROTECT, related_name='investment_sales')
    created_at = models.DateTimeField(auto_now_add=True)
