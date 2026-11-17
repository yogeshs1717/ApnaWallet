from decimal import Decimal
from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db.models import Q
from django.middleware.csrf import get_token
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import Category, FinancialAccount, Transaction, User
from .serializers import (
    AddCashSerializer,
    CategorySerializer,
    ExpenseSerializer,
    FinancialAccountSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    TransactionSerializer,
    TransferSerializer,
    UpdateExpenseSerializer,
    UserProfileSerializer,
)
from .services import (
    execute_add_cash,
    execute_expense,
    execute_transfer,
    seed_default_categories,
    update_expense,
    void_transaction,
)


class PasswordResetThrottle(AnonRateThrottle):
    rate = '5/minute'


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        "status": "ok",
        "application": "ApnaWallet"
    })


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    token = get_token(request)
    return Response({"csrfToken": token})


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        seed_default_categories()
        login(request, user)
        profile_data = UserProfileSerializer(user).data
        return Response({
            "message": "Registration successful.",
            "user": profile_data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        seed_default_categories()
        profile_data = UserProfileSerializer(user).data
        return Response({
            "message": "Login successful.",
            "user": profile_data
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    serializer = UserProfileSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_accounts_view(request):
    accounts = FinancialAccount.objects.filter(user=request.user)
    serializer = FinancialAccountSerializer(accounts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_detail_view(request, pk):
    try:
        account = FinancialAccount.objects.get(pk=pk, user=request.user)
    except FinancialAccount.DoesNotExist:
        return Response({"detail": "Financial account not found."}, status=status.HTTP_404_NOT_FOUND)
    serializer = FinancialAccountSerializer(account)
    return Response(serializer.data, status=status.HTTP_200_OK)


# -------------------------------------------------------------
# Categories API
# -------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def categories_view(request):
    """
    GET: Returns system default categories + user custom categories.
    POST: Creates a user-specific custom category.
    """
    seed_default_categories()

    if request.method == 'GET':
        categories = Category.objects.filter(
            Q(user=None) | Q(user=request.user),
            is_active=True
        ).order_by('name')
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        name = request.data.get('name', '').strip()
        if not name:
            return Response({"name": "Category name is required."}, status=status.HTTP_400_BAD_REQUEST)

        icon = request.data.get('icon', 'Tag')
        color = request.data.get('color', '#FF6B00')

        category = Category.objects.create(
            user=request.user,
            name=name,
            icon=icon,
            color=color,
            is_active=True
        )
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def category_delete_view(request, pk):
    """
    Soft-archives a custom category (is_active=False) to preserve historical transactions.
    """
    try:
        category = Category.objects.get(pk=pk, user=request.user)
    except Category.DoesNotExist:
        return Response({"detail": "Custom category not found or belongs to system defaults."}, status=status.HTTP_404_NOT_FOUND)

    category.is_active = False
    category.save(update_fields=['is_active'])
    return Response({"message": "Category archived successfully."}, status=status.HTTP_200_OK)


# -------------------------------------------------------------
# Financial Engine Endpoints (Add Cash, Expense, Transfer)
# -------------------------------------------------------------

def resolve_target_account(user, account_id=None):
    if account_id:
        return FinancialAccount.objects.get(pk=account_id, user=user)
    default_acc = user.financial_accounts.filter(is_default=True).first()
    if not default_acc:
        default_acc = user.financial_accounts.first()
    if not default_acc:
        raise DjangoValidationError("No financial account found for user.")
    return default_acc


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_cash_view(request):
    serializer = AddCashSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        account = resolve_target_account(request.user, data.get('account_id'))
    except FinancialAccount.DoesNotExist:
        return Response({"detail": "Target financial account not found."}, status=status.HTTP_404_NOT_FOUND)

    category = None
    if data.get('category_id'):
        category = Category.objects.filter(pk=data['category_id'], is_active=True).first()

    try:
        txn, updated_account = execute_add_cash(
            account=account,
            amount=data['amount'],
            destination_balance_type=data['balance_type'],
            note=data['note'],
            date=data.get('date'),
            category=category
        )
    except DjangoValidationError as err:
        return Response({"detail": err.messages if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": f"Successfully added ₹{txn.amount} to {txn.balance_type} balance.",
        "transaction": TransactionSerializer(txn).data,
        "account": FinancialAccountSerializer(updated_account).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def expense_view(request):
    serializer = ExpenseSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        account = resolve_target_account(request.user, data.get('account_id'))
    except FinancialAccount.DoesNotExist:
        return Response({"detail": "Target financial account not found."}, status=status.HTTP_404_NOT_FOUND)

    category = None
    if data.get('category_id'):
        category = Category.objects.filter(pk=data['category_id'], is_active=True).first()

    try:
        txn, updated_account = execute_expense(
            account=account,
            amount=data['amount'],
            source_balance_type=data['balance_type'],
            note=data['note'],
            date=data.get('date'),
            category=category
        )
    except DjangoValidationError as err:
        msg = err.messages[0] if hasattr(err, 'messages') else str(err)
        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": f"Successfully recorded expense of ₹{txn.amount} from {txn.balance_type}.",
        "transaction": TransactionSerializer(txn).data,
        "account": FinancialAccountSerializer(updated_account).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transfer_view(request):
    serializer = TransferSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        account = resolve_target_account(request.user, data.get('account_id'))
    except FinancialAccount.DoesNotExist:
        return Response({"detail": "Target financial account not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        txn, updated_account = execute_transfer(
            account=account,
            amount=data['amount'],
            source_balance_type=data['source_balance_type'],
            destination_balance_type=data['destination_balance_type'],
            note=data['note'],
            date=data.get('date')
        )
    except DjangoValidationError as err:
        msg = err.messages[0] if hasattr(err, 'messages') else str(err)
        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": f"Transferred ₹{txn.amount} from {txn.balance_type} to {txn.destination_balance_type}.",
        "transaction": TransactionSerializer(txn).data,
        "account": FinancialAccountSerializer(updated_account).data
    }, status=status.HTTP_201_CREATED)


# -------------------------------------------------------------
# Transaction Ledger & Query API
# -------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_list_view(request):
    """
    Search, filter, and paginate financial transactions belonging to authenticated user.
    """
    queryset = Transaction.objects.filter(account__user=request.user)

    # Filter by specific account
    account_id = request.query_params.get('account_id')
    if account_id:
        queryset = queryset.filter(account_id=account_id)

    # Search keyword in note
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(note__icontains=search) | Q(category__name__icontains=search)
        )

    # Transaction type filter
    txn_type = request.query_params.get('transaction_type')
    if txn_type:
        queryset = queryset.filter(transaction_type=txn_type)

    # Balance type filter
    balance_type = request.query_params.get('balance_type')
    if balance_type:
        queryset = queryset.filter(
            Q(balance_type=balance_type) | Q(destination_balance_type=balance_type)
        )

    # Category filter
    category_id = request.query_params.get('category_id')
    if category_id:
        queryset = queryset.filter(category_id=category_id)

    # Date range filters
    date_from = request.query_params.get('date_from')
    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    date_to = request.query_params.get('date_to')
    if date_to:
        queryset = queryset.filter(date__lte=date_to)

    # Amount range filters
    amount_min = request.query_params.get('amount_min')
    if amount_min:
        queryset = queryset.filter(amount__gte=Decimal(amount_min))
    amount_max = request.query_params.get('amount_max')
    if amount_max:
        queryset = queryset.filter(amount__lte=Decimal(amount_max))

    # Exclude voided records by default
    include_voided = request.query_params.get('include_voided', 'false').lower() == 'true'
    if not include_voided:
        queryset = queryset.filter(is_voided=False)

    # Ordering
    queryset = queryset.order_by('-date', '-created_at')

    # Simple pagination
    total_count = queryset.count()
    limit = int(request.query_params.get('limit', 20))
    offset = int(request.query_params.get('offset', 0))
    page_items = queryset[offset:offset + limit]

    serializer = TransactionSerializer(page_items, many=True)
    return Response({
        "count": total_count,
        "limit": limit,
        "offset": offset,
        "results": serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def transaction_detail_view(request, pk):
    """
    PATCH: Edit an expense with differential balance recalculation.
    DELETE: Void a transaction with audit-safe balance restoration.
    """
    if request.method == 'PATCH':
        serializer = UpdateExpenseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        category = None
        if 'category_id' in data:
            category = Category.objects.filter(pk=data['category_id'], is_active=True).first() if data['category_id'] else None

        try:
            txn, updated_account = update_expense(
                transaction_id=pk,
                user=request.user,
                new_amount=data.get('amount'),
                new_balance_type=data.get('balance_type'),
                new_note=data.get('note'),
                new_date=data.get('date'),
                new_category=category
            )
        except Transaction.DoesNotExist:
            return Response({"detail": "Expense transaction not found."}, status=status.HTTP_404_NOT_FOUND)
        except DjangoValidationError as err:
            msg = err.messages[0] if hasattr(err, 'messages') else str(err)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "Expense updated successfully.",
            "transaction": TransactionSerializer(txn).data,
            "account": FinancialAccountSerializer(updated_account).data
        }, status=status.HTTP_200_OK)

    elif request.method == 'DELETE':
        try:
            txn, updated_account = void_transaction(transaction_id=pk, user=request.user)
        except Transaction.DoesNotExist:
            return Response({"detail": "Transaction not found."}, status=status.HTTP_404_NOT_FOUND)
        except DjangoValidationError as err:
            msg = err.messages[0] if hasattr(err, 'messages') else str(err)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "Transaction voided and balances restored successfully.",
            "transaction": TransactionSerializer(txn).data,
            "account": FinancialAccountSerializer(updated_account).data
        }, status=status.HTTP_200_OK)


# -------------------------------------------------------------
# Password Recovery Endpoints
# -------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_request_view(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email'].lower().strip()
        user = User.objects.filter(email=email, is_active=True).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

            subject = "ApnaWallet — Password Reset Request"
            message = (
                f"Hello {user.full_name},\n\n"
                f"We received a request to reset the password for your ApnaWallet account.\n\n"
                f"Click the link below to set a new password:\n{reset_url}\n\n"
                f"This link is time-limited and can only be used once.\n"
                f"If you did not request this, please disregard this email.\n\n"
                f"— Team ApnaWallet (Your Money. Your Rules.)"
            )

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response({
            "message": "If this email address is registered, a password reset link has been dispatched."
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        uid_b64 = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response({
            "message": "Your password has been reset successfully. Please log in with your new credentials."
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
