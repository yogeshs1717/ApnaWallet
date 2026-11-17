from decimal import Decimal
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User, FinancialAccount


class FinancialAccountSerializer(serializers.ModelSerializer):
    """
    Serializer for User's Financial Account.
    """
    class Meta:
        model = FinancialAccount
        fields = [
            'id',
            'name',
            'is_default',
            'currency',
            'cash_balance',
            'bank_balance',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


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
        # Enforces Django's built-in password validators
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name']
        )
        # Automatically create default 'Personal' financial account
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
    """
    Serializer for requesting a password reset email.
    """
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset with token.
    """
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value
