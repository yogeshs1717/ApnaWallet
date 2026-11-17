from decimal import Decimal
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Category, FinancialAccount, Transaction, User


class FinancialAccountSerializer(serializers.ModelSerializer):
    """
    Serializer for User's Financial Account with precise balance formatting.
    """
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

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
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'total_balance', 'created_at', 'updated_at']


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


# -------------------------------------------------------------
# Financial Engine Serializers (Prompt 04)
# -------------------------------------------------------------

class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Expense / Income Categories.
    """
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'color', 'is_active', 'user']
        read_only_fields = ['id', 'user']


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for Transaction ledger history.
    """
    category_details = CategorySerializer(source='category', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'account',
            'account_name',
            'transaction_type',
            'amount',
            'balance_type',
            'destination_balance_type',
            'category',
            'category_details',
            'note',
            'date',
            'is_voided',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'is_voided', 'created_at', 'updated_at']


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
    source_balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'])
    destination_balance_type = serializers.ChoiceField(choices=['CASH', 'BANK'])
    note = serializers.CharField(max_length=255)
    date = serializers.DateField(required=False)

    def validate(self, attrs):
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
