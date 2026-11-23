from decimal import Decimal
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from .models import (
    Category,
    CreditRecord,
    CreditRepayment,
    FinancialAccount,
    LendingAdjustment,
    LendingRecord,
    LendingRepayment,
    Transaction,
    User,
    Investment,
    InvestmentSale,
    SavingsGoal,
    SavingsDeposit,
    SavingsWithdrawal,
    MonthlyBudget,
    RecurringExpenseTemplate,
    RecurringExpenseOccurrence,
    Notification,
)


class FinancialAccountSerializer(serializers.ModelSerializer):
    """
    Serializer for User's Financial Account with precise balance formatting.
    Includes running totals for Money Lent (receivables) and Credit Outstanding (liabilities).
    """
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_lent_outstanding = serializers.SerializerMethodField()
    total_credit_outstanding = serializers.SerializerMethodField()

    class Meta:
        model = FinancialAccount
        fields = [
            'id',
            'name',
            'is_default',
            'currency',
            'cash_balance',
            'bank_balance',
            'total_balance',
            'total_lent_outstanding',
            'total_credit_outstanding',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'total_balance',
            'total_lent_outstanding',
            'total_credit_outstanding',
            'created_at',
            'updated_at'
        ]

    def get_total_lent_outstanding(self, obj):
        from django.db.models import Sum
        total = obj.lendings.aggregate(total=Sum('outstanding_amount'))['total']
        return f"{total:.2f}" if total is not None else "0.00"

    def get_total_credit_outstanding(self, obj):
        from django.db.models import Sum
        total = obj.credits.aggregate(total=Sum('outstanding_amount'))['total']
        return f"{total:.2f}" if total is not None else "0.00"


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for authenticated User profile.
    """
    default_account = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'created_at', 'default_account']
        read_only_fields = ['id', 'email', 'created_at', 'default_account']

    def get_default_account(self, obj):
        account = obj.financial_accounts.filter(is_default=True).first()
        if account:
            return FinancialAccountSerializer(account).data
        return None


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for user registration with strong password validation.
    """
    full_name = serializers.CharField(max_length=150, min_length=2)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        normalized_email = value.lower().strip()
        if User.objects.filter(email=normalized_email).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized_email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name']
        )
        FinancialAccount.objects.create(
            user=user,
            name='Personal',
            is_default=True,
            currency='INR',
            cash_balance=Decimal('0.00'),
            bank_balance=Decimal('0.00')
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for authenticating users via email and password.
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').lower().strip()
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError("Both email and password are required.")

        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This user account has been disabled.")

        attrs['user'] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'color', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class TransactionSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'account',
            'transaction_type',
            'amount',
            'balance_type',
            'destination_balance_type',
            'category',
            'category_id',
            'note',
            'date',
            'is_voided',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'account', 'created_at', 'updated_at']


class AddCashSerializer(serializers.Serializer):
    account_id = serializers.UUIDField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'])
    note = serializers.CharField(max_length=255)
    date = serializers.DateField(required=False)
    category_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_note(self, value):
        trimmed = value.strip()
        if len(trimmed) < 3:
            raise serializers.ValidationError("Note/Description must contain at least 3 characters.")
        return trimmed


class ExpenseSerializer(serializers.Serializer):
    account_id = serializers.UUIDField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'])
    note = serializers.CharField(max_length=255)
    date = serializers.DateField(required=False)
    category_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_note(self, value):
        trimmed = value.strip()
        if len(trimmed) < 3:
            raise serializers.ValidationError("Note must contain at least 3 characters.")
        return trimmed


class TransferSerializer(serializers.Serializer):
    account_id = serializers.UUIDField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    source_balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'], required=False)
    balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'], required=False)
    destination_balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'], required=False)
    note = serializers.CharField(max_length=255)
    date = serializers.DateField(required=False)

    def validate(self, attrs):
        src = attrs.get('source_balance_type') or attrs.get('balance_type')
        if not src:
            raise serializers.ValidationError({"source_balance_type": "This field is required. Must be CASH or BANK."})
        attrs['source_balance_type'] = src

        dest = attrs.get('destination_balance_type')
        if not dest:
            dest = 'BANK' if src == 'CASH' else 'CASH'
        attrs['destination_balance_type'] = dest

        if attrs['source_balance_type'] == attrs['destination_balance_type']:
            raise serializers.ValidationError("Source and destination balance types must be different.")
        trimmed = attrs.get('note', '').strip()
        if len(trimmed) < 3:
            raise serializers.ValidationError({"note": "Transfer note must contain at least 3 characters."})
        attrs['note'] = trimmed
        return attrs


class UpdateExpenseSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'), required=False)
    balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'], required=False)
    note = serializers.CharField(max_length=255, required=False)
    date = serializers.DateField(required=False)
    category_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_note(self, value):
        if value is not None:
            trimmed = value.strip()
            if len(trimmed) < 3:
                raise serializers.ValidationError("Note must contain at least 3 characters.")
            return trimmed
        return value


# ==============================================================================
# LENDING SERIALIZERS (Prompt 05)
# ==============================================================================

class LendingRepaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LendingRepayment
        fields = [
            'id',
            'amount',
            'balance_type',
            'repayment_date',
            'note',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LendingAdjustmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LendingAdjustment
        fields = [
            'id',
            'adjustment_amount',
            'reason',
            'previous_outstanding',
            'new_outstanding',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LendingRecordSerializer(serializers.ModelSerializer):
    repayments = LendingRepaymentSerializer(many=True, read_only=True)
    adjustments = LendingAdjustmentSerializer(many=True, read_only=True)

    class Meta:
        model = LendingRecord
        fields = [
            'id',
            'account',
            'borrower_name',
            'original_amount',
            'outstanding_amount',
            'amount_repaid',
            'lending_date',
            'notes',
            'status',
            'created_at',
            'updated_at',
            'repayments',
            'adjustments'
        ]
        read_only_fields = [
            'id',
            'account',
            'outstanding_amount',
            'amount_repaid',
            'status',
            'created_at',
            'updated_at',
            'repayments',
            'adjustments'
        ]


class CreateLendSerializer(serializers.Serializer):
    account_id = serializers.UUIDField(required=False)
    borrower_name = serializers.CharField(max_length=120, min_length=1)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'])
    date = serializers.DateField(required=False)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_borrower_name(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Borrower name cannot be empty.")
        return trimmed


class LendingRepaymentInputSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'])
    date = serializers.DateField(required=False)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)


class LendingAdjustmentInputSerializer(serializers.Serializer):
    new_outstanding_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.00'))
    reason = serializers.CharField(max_length=255, min_length=3)

    def validate_reason(self, value):
        trimmed = value.strip()
        if len(trimmed) < 3:
            raise serializers.ValidationError("Reason must contain at least 3 characters.")
        return trimmed


class UpdateLendingMetadataSerializer(serializers.Serializer):
    borrower_name = serializers.CharField(max_length=120, required=False)
    notes = serializers.CharField(max_length=255, required=False, allow_blank=True)


# ==============================================================================
# CREDIT SERIALIZERS (Prompt 05)
# ==============================================================================

class CreditRepaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditRepayment
        fields = [
            'id',
            'amount',
            'payment_source',
            'repayment_date',
            'note',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CreditRecordSerializer(serializers.ModelSerializer):
    repayments = CreditRepaymentSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = CreditRecord
        fields = [
            'id',
            'account',
            'creditor_name',
            'original_amount',
            'outstanding_amount',
            'amount_repaid',
            'credit_date',
            'pay_by_date',
            'is_overdue',
            'description',
            'funds_received',
            'received_balance_type',
            'status',
            'created_at',
            'updated_at',
            'repayments'
        ]
        read_only_fields = [
            'id',
            'account',
            'outstanding_amount',
            'amount_repaid',
            'is_overdue',
            'status',
            'created_at',
            'updated_at',
            'repayments'
        ]


class CreateCreditSerializer(serializers.Serializer):
    account_id = serializers.UUIDField(required=False)
    creditor_name = serializers.CharField(max_length=120, min_length=1)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    credit_date = serializers.DateField(required=False)
    pay_by_date = serializers.DateField(required=False, allow_null=True)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    receive_funds = serializers.BooleanField(required=False, default=False)
    destination_balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'], required=False, allow_null=True)

    def validate_creditor_name(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Creditor name cannot be empty.")
        return trimmed

    def validate(self, attrs):
        if attrs.get('receive_funds') and not attrs.get('destination_balance_type'):
            raise serializers.ValidationError({
                "destination_balance_type": "Destination balance type (CASH or BANK) is required when receiving funds."
            })
        return attrs


class CreditRepaymentInputSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    payment_source = serializers.ChoiceField(choices=['CASH', 'BANK'])
    date = serializers.DateField(required=False)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)


class UpdateCreditMetadataSerializer(serializers.Serializer):
    creditor_name = serializers.CharField(max_length=120, required=False)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    pay_by_date = serializers.DateField(required=False, allow_null=True)
    clear_due_date = serializers.BooleanField(required=False, default=False)


class SavingsGoalSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.SerializerMethodField()
    class Meta:
        model = SavingsGoal
        fields = ['id', 'name', 'target_amount', 'saved_amount', 'target_date', 'status', 'progress_percentage', 'created_at', 'updated_at']
        read_only_fields = ['id', 'saved_amount', 'status', 'progress_percentage', 'created_at', 'updated_at']

    def get_progress_percentage(self, obj):
        return f"{obj.progress_percentage:.2f}"


class SavingsDepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsDeposit
        fields = ['id', 'amount', 'source_balance_type', 'created_at']


class SavingsWithdrawalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsWithdrawal
        fields = ['id', 'amount', 'destination_balance_type', 'created_at']


class InvestmentSaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestmentSale
        fields = ['id', 'cost_basis_sold', 'proceeds', 'realized_gain_loss', 'destination_balance_type', 'sale_date', 'note', 'created_at']


class InvestmentSerializer(serializers.ModelSerializer):
    sales = InvestmentSaleSerializer(many=True, read_only=True)
    class Meta:
        model = Investment
        fields = ['id', 'name', 'investment_type', 'cost_basis', 'platform', 'purchase_date', 'note', 'is_closed', 'sales', 'created_at', 'updated_at']
        read_only_fields = ['id', 'cost_basis', 'is_closed', 'sales', 'created_at', 'updated_at']


class MonthlyBudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    usage_percentage = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    warning = serializers.BooleanField(read_only=True)

    class Meta:
        model = MonthlyBudget
        fields = [
            'id', 'account', 'month', 'category', 'category_name', 'amount',
            'is_active', 'spent', 'remaining', 'usage_percentage', 'warning',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'account', 'spent', 'remaining', 'usage_percentage', 'warning', 'created_at', 'updated_at']


class RecurringExpenseOccurrenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringExpenseOccurrence
        fields = ['id', 'scheduled_date', 'transaction', 'created_at']
        read_only_fields = fields


class RecurringExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    status = serializers.SerializerMethodField()
    occurrences = RecurringExpenseOccurrenceSerializer(many=True, read_only=True)

    class Meta:
        model = RecurringExpenseTemplate
        fields = [
            'id', 'account', 'name', 'amount', 'category', 'category_name',
            'balance_type', 'frequency', 'start_date', 'next_due_date',
            'end_date', 'note', 'enabled', 'status', 'occurrences',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'account', 'status', 'occurrences', 'created_at', 'updated_at']

    def get_status(self, obj):
        if obj.deleted_at:
            return 'CANCELLED'
        if not obj.enabled:
            return 'PAUSED'
        return 'OVERDUE' if obj.next_due_date < timezone.now().date() else 'UPCOMING'


class NotificationSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    related_screen = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'kind', 'title', 'message', 'related_id', 'due_date',
            'amount', 'is_read', 'dismissed_on', 'status', 'related_screen',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_status(self, obj):
        if obj.kind == Notification.Kind.DAILY_EXPENSE:
            return 'ACTION_REQUIRED'
        if not obj.due_date:
            return 'REMINDER'
        today = self.context.get('local_date', timezone.localdate())
        if obj.due_date < today:
            return 'OVERDUE'
        if obj.due_date == today:
            return 'DUE_TODAY'
        return 'UPCOMING'

    def get_related_screen(self, obj):
        return 'credit' if obj.kind == Notification.Kind.CREDIT_PAYMENT else (
            'reports' if obj.kind == Notification.Kind.RECURRING_EXPENSE else 'home'
        )
