from decimal import Decimal
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import IntegrityError
from django.db.models import Q, Sum
from django.middleware.csrf import get_token
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

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
    SavingsGoal,
    MonthlyBudget,
    RecurringExpenseTemplate,
)
from .serializers import (
    AddCashSerializer,
    CategorySerializer,
    CreateCreditSerializer,
    CreateLendSerializer,
    CreditRecordSerializer,
    CreditRepaymentInputSerializer,
    CreditRepaymentSerializer,
    ExpenseSerializer,
    FinancialAccountSerializer,
    LendingAdjustmentInputSerializer,
    LendingAdjustmentSerializer,
    LendingRecordSerializer,
    LendingRepaymentInputSerializer,
    LendingRepaymentSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    TransactionSerializer,
    TransferSerializer,
    UpdateCreditMetadataSerializer,
    UpdateExpenseSerializer,
    UpdateLendingMetadataSerializer,
    UserProfileSerializer,
    InvestmentSerializer,
    InvestmentSaleSerializer,
    SavingsGoalSerializer,
    SavingsDepositSerializer,
    SavingsWithdrawalSerializer,
    MonthlyBudgetSerializer,
    RecurringExpenseSerializer,
    RecurringExpenseOccurrenceSerializer,
)
from .services import (
    execute_add_cash,
    execute_create_credit,
    execute_credit_repayment,
    execute_expense,
    execute_lend,
    execute_lending_adjustment,
    execute_lending_repayment,
    execute_transfer,
    seed_default_categories,
    update_credit_metadata,
    update_expense,
    update_lending_metadata,
    void_transaction,
    execute_goal_action,
    execute_investment_purchase,
    execute_investment_sale,
    execute_savings_deposit,
    execute_savings_goal,
    execute_savings_withdrawal,
    execute_record_recurring_expense,
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


# -------------------------------------------------------------
# Lending Endpoints (Prompt 05)
# -------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def lending_list_view(request):
    """
    GET: List user's lending records with total summary metrics.
    POST: Create a new lending record and disburse money from Cash or Bank.
    """
    if request.method == 'GET':
        qs = LendingRecord.objects.filter(user=request.user).prefetch_related('repayments', 'adjustments')

        account_id = request.query_params.get('account_id')
        if account_id:
            qs = qs.filter(account_id=account_id)

        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.upper())

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(Q(borrower_name__icontains=search) | Q(notes__icontains=search))

        totals = qs.aggregate(
            total_lent=Sum('original_amount'),
            total_outstanding=Sum('outstanding_amount'),
            total_repaid=Sum('amount_repaid')
        )

        return Response({
            "total_lent": f"{(totals['total_lent'] or Decimal('0.00')):.2f}",
            "total_outstanding": f"{(totals['total_outstanding'] or Decimal('0.00')):.2f}",
            "total_repaid": f"{(totals['total_repaid'] or Decimal('0.00')):.2f}",
            "count": qs.count(),
            "results": LendingRecordSerializer(qs, many=True).data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = CreateLendSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            account = resolve_target_account(request.user, data.get('account_id'))
        except FinancialAccount.DoesNotExist:
            return Response({"detail": "Target financial account not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            lending, txn, updated_account = execute_lend(
                account=account,
                borrower_name=data['borrower_name'],
                amount=data['amount'],
                source_balance_type=data['balance_type'],
                date=data.get('date'),
                note=data.get('note', '')
            )
        except DjangoValidationError as err:
            msg = err.messages[0] if hasattr(err, 'messages') else str(err)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": f"Successfully recorded lending of ₹{lending.original_amount} to {lending.borrower_name}.",
            "lending": LendingRecordSerializer(lending).data,
            "transaction": TransactionSerializer(txn).data,
            "account": FinancialAccountSerializer(updated_account).data
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def lending_detail_view(request, pk):
    """
    GET: Retrieve lending record detail with repayment and adjustment history.
    PATCH: Update borrower name or notes without altering balances.
    """
    try:
        lending = LendingRecord.objects.prefetch_related('repayments', 'adjustments').get(pk=pk, user=request.user)
    except LendingRecord.DoesNotExist:
        return Response({"detail": "Lending record not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(LendingRecordSerializer(lending).data, status=status.HTTP_200_OK)

    elif request.method == 'PATCH':
        serializer = UpdateLendingMetadataSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        updated_lending = update_lending_metadata(
            lending_id=lending.pk,
            user=request.user,
            borrower_name=data.get('borrower_name'),
            notes=data.get('notes')
        )
        return Response({
            "message": "Lending details updated successfully.",
            "lending": LendingRecordSerializer(updated_lending).data
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def lending_repay_view(request, pk):
    """
    Record partial or full repayment for a lending record.
    Principal recovery is deposited into Cash or Bank and does not count as income.
    """
    try:
        LendingRecord.objects.get(pk=pk, user=request.user)
    except LendingRecord.DoesNotExist:
        return Response({"detail": "Lending record not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = LendingRepaymentInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        repayment, lending, txn, updated_account = execute_lending_repayment(
            lending_id=pk,
            user=request.user,
            amount=data['amount'],
            destination_balance_type=data['balance_type'],
            repayment_date=data.get('date'),
            note=data.get('note', '')
        )
    except DjangoValidationError as err:
        msg = err.messages[0] if hasattr(err, 'messages') else str(err)
        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": f"Repayment of ₹{repayment.amount} recorded successfully. Status: {lending.status}.",
        "repayment": LendingRepaymentSerializer(repayment).data,
        "lending": LendingRecordSerializer(lending).data,
        "transaction": TransactionSerializer(txn).data,
        "account": FinancialAccountSerializer(updated_account).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def lending_adjust_view(request, pk):
    """
    Manually adjust remaining outstanding amount with an explicit reason.
    CRITICAL: Does NOT touch Cash or Bank balance.
    """
    try:
        LendingRecord.objects.get(pk=pk, user=request.user)
    except LendingRecord.DoesNotExist:
        return Response({"detail": "Lending record not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = LendingAdjustmentInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        adj, lending = execute_lending_adjustment(
            lending_id=pk,
            user=request.user,
            new_outstanding_amount=data['new_outstanding_amount'],
            reason=data['reason']
        )
    except DjangoValidationError as err:
        msg = err.messages[0] if hasattr(err, 'messages') else str(err)
        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": f"Outstanding balance adjusted to ₹{lending.outstanding_amount}.",
        "adjustment": LendingAdjustmentSerializer(adj).data,
        "lending": LendingRecordSerializer(lending).data
    }, status=status.HTTP_200_OK)


# -------------------------------------------------------------
# Credit Endpoints (Prompt 05)
# -------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def credit_list_view(request):
    """
    GET: List user's credit records with summary metrics.
    POST: Create a new credit liability (with optional funds received into Cash/Bank).
    """
    if request.method == 'GET':
        qs = CreditRecord.objects.filter(user=request.user).prefetch_related('repayments')

        account_id = request.query_params.get('account_id')
        if account_id:
            qs = qs.filter(account_id=account_id)

        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.upper())

        search = request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(Q(creditor_name__icontains=search) | Q(description__icontains=search))

        totals = qs.aggregate(
            total_credit=Sum('original_amount'),
            total_outstanding=Sum('outstanding_amount'),
            total_repaid=Sum('amount_repaid')
        )

        return Response({
            "total_credit": f"{(totals['total_credit'] or Decimal('0.00')):.2f}",
            "total_outstanding": f"{(totals['total_outstanding'] or Decimal('0.00')):.2f}",
            "total_repaid": f"{(totals['total_repaid'] or Decimal('0.00')):.2f}",
            "count": qs.count(),
            "results": CreditRecordSerializer(qs, many=True).data
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        serializer = CreateCreditSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            account = resolve_target_account(request.user, data.get('account_id'))
        except FinancialAccount.DoesNotExist:
            return Response({"detail": "Target financial account not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            credit, txn, updated_account = execute_create_credit(
                account=account,
                creditor_name=data['creditor_name'],
                amount=data['amount'],
                credit_date=data.get('credit_date'),
                pay_by_date=data.get('pay_by_date'),
                description=data.get('description', ''),
                receive_funds=data.get('receive_funds', False),
                destination_balance_type=data.get('destination_balance_type')
            )
        except DjangoValidationError as err:
            msg = err.messages[0] if hasattr(err, 'messages') else str(err)
            return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": f"Successfully recorded credit obligation of ₹{credit.original_amount} to {credit.creditor_name}.",
            "credit": CreditRecordSerializer(credit).data,
            "transaction": TransactionSerializer(txn).data if txn else None,
            "account": FinancialAccountSerializer(updated_account).data if updated_account else None
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def credit_detail_view(request, pk):
    """
    GET: Retrieve credit detail with repayment history.
    PATCH: Update creditor name, description, or optional due date.
    """
    try:
        credit = CreditRecord.objects.prefetch_related('repayments').get(pk=pk, user=request.user)
    except CreditRecord.DoesNotExist:
        return Response({"detail": "Credit record not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(CreditRecordSerializer(credit).data, status=status.HTTP_200_OK)

    elif request.method == 'PATCH':
        serializer = UpdateCreditMetadataSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        updated_credit = update_credit_metadata(
            credit_id=credit.pk,
            user=request.user,
            creditor_name=data.get('creditor_name'),
            description=data.get('description'),
            pay_by_date=data.get('pay_by_date'),
            clear_due_date=data.get('clear_due_date', False)
        )
        return Response({
            "message": "Credit details updated successfully.",
            "credit": CreditRecordSerializer(updated_credit).data
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def credit_repay_view(request, pk):
    """
    Deduct money from Cash or Bank and pay down credit debt.
    Principal debt reduction does NOT count as an ordinary expense.
    """
    try:
        CreditRecord.objects.get(pk=pk, user=request.user)
    except CreditRecord.DoesNotExist:
        return Response({"detail": "Credit record not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = CreditRepaymentInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        repayment, credit, txn, updated_account = execute_credit_repayment(
            credit_id=pk,
            user=request.user,
            amount=data['amount'],
            payment_source=data['payment_source'],
            repayment_date=data.get('date'),
            note=data.get('note', '')
        )
    except DjangoValidationError as err:
        msg = err.messages[0] if hasattr(err, 'messages') else str(err)
        return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": f"Repayment of ₹{repayment.amount} recorded to {credit.creditor_name}. Status: {credit.status}.",
        "repayment": CreditRepaymentSerializer(repayment).data,
        "credit": CreditRecordSerializer(credit).data,
        "transaction": TransactionSerializer(txn).data,
        "account": FinancialAccountSerializer(updated_account).data
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def savings_goals_view(request):
    if request.method == 'GET':
        goals = SavingsGoal.objects.filter(user=request.user).prefetch_related('deposits', 'withdrawals')
        saved = sum((g.saved_amount for g in goals), Decimal('0.00'))
        active = goals.filter(status=SavingsGoal.Status.ACTIVE).first()
        return Response({
            'saved_wallet_balance': f'{saved:.2f}',
            'active_goal': SavingsGoalSerializer(active).data if active else None,
            'goals': SavingsGoalSerializer(goals, many=True).data,
        })
    serializer = SavingsGoalSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        goal = execute_savings_goal(request.user, resolve_target_account(request.user), serializer.validated_data['name'],
                                    serializer.validated_data['target_amount'], serializer.validated_data.get('target_date'))
    except (DjangoValidationError, FinancialAccount.DoesNotExist) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(SavingsGoalSerializer(goal).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def savings_deposit_view(request, pk):
    amount = request.data.get('amount')
    try:
        amount = Decimal(str(amount))
        deposit, goal, txn, account = execute_savings_deposit(pk, request.user, amount, request.data.get('balance_type'), request.data.get('date'))
    except (DjangoValidationError, ValueError, TypeError, SavingsGoal.DoesNotExist) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'deposit': SavingsDepositSerializer(deposit).data, 'goal': SavingsGoalSerializer(goal).data,
                     'account': FinancialAccountSerializer(account).data, 'transaction': TransactionSerializer(txn).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def savings_withdrawal_view(request, pk):
    try:
        amount = Decimal(str(request.data.get('amount')))
        withdrawal, goal, txn, account = execute_savings_withdrawal(pk, request.user, amount, request.data.get('balance_type'), request.data.get('date'))
    except (DjangoValidationError, ValueError, TypeError, SavingsGoal.DoesNotExist) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'withdrawal': SavingsWithdrawalSerializer(withdrawal).data, 'goal': SavingsGoalSerializer(goal).data,
                     'account': FinancialAccountSerializer(account).data, 'transaction': TransactionSerializer(txn).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def savings_goal_action_view(request, pk):
    try:
        goal = execute_goal_action(pk, request.user, request.data.get('action'), request.data.get('balance_type'))
    except (DjangoValidationError, SavingsGoal.DoesNotExist) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(SavingsGoalSerializer(goal).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def investments_view(request):
    if request.method == 'GET':
        investments = Investment.objects.filter(user=request.user).prefetch_related('sales')
        total = sum((i.cost_basis for i in investments), Decimal('0.00'))
        return Response({'total_invested': f'{total:.2f}', 'investments': InvestmentSerializer(investments, many=True).data})
    data = request.data
    try:
        investment, txn, account = execute_investment_purchase(request.user, resolve_target_account(request.user, data.get('account_id')),
            data['name'], data['investment_type'], Decimal(str(data['amount'])), data['platform'],
            data.get('purchase_date'), data.get('note', ''), data.get('balance_type', 'BANK'))
    except (DjangoValidationError, KeyError, ValueError, TypeError, FinancialAccount.DoesNotExist) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'investment': InvestmentSerializer(investment).data, 'account': FinancialAccountSerializer(account).data,
                     'transaction': TransactionSerializer(txn).data}, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'POST'])
@permission_classes([IsAuthenticated])
def investment_detail_view(request, pk):
    try:
        investment = Investment.objects.get(pk=pk, user=request.user)
    except Investment.DoesNotExist:
        return Response({'detail': 'Investment not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PATCH':
        for field in ['name', 'investment_type', 'platform', 'purchase_date', 'note']:
            if field in request.data:
                setattr(investment, field, request.data[field])
        investment.save()
        return Response(InvestmentSerializer(investment).data)
    try:
        sale, investment, txn, account = execute_investment_sale(pk, request.user, Decimal(str(request.data['cost_basis_sold'])),
            Decimal(str(request.data['proceeds'])), request.data['balance_type'], request.data.get('sale_date'), request.data.get('note', ''))
    except (DjangoValidationError, KeyError, ValueError, TypeError, Investment.DoesNotExist) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'sale': InvestmentSaleSerializer(sale).data, 'investment': InvestmentSerializer(investment).data,
                     'account': FinancialAccountSerializer(account).data, 'transaction': TransactionSerializer(txn).data})


def _budget_month(value):
    try:
        parsed = datetime.strptime(value, '%Y-%m').date()
        return parsed.replace(day=1)
    except (TypeError, ValueError):
        raise DjangoValidationError("Month must use YYYY-MM format.")


def _budget_spent(budget):
    filters = {
        'account_id': budget.account_id,
        'transaction_type': Transaction.TransactionType.EXPENSE,
        'is_voided': False,
        'date__gte': budget.month,
    }
    next_month = (budget.month.replace(day=28) + timedelta(days=4)).replace(day=1)
    filters['date__lt'] = next_month
    if budget.category_id:
        filters['category_id'] = budget.category_id
    return Transaction.objects.filter(**filters).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')


def _budget_data(budget):
    spent = _budget_spent(budget)
    usage = (spent / budget.amount * Decimal('100.00')) if budget.amount else Decimal('0.00')
    data = MonthlyBudgetSerializer(budget).data
    data.update({
        'spent': f'{spent:.2f}',
        'remaining': f'{(budget.amount - spent):.2f}',
        'usage_percentage': f'{usage:.2f}',
        'warning': spent >= budget.amount,
    })
    return data


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def budgets_view(request):
    if request.method == 'GET':
        try:
            month = _budget_month(request.query_params.get('month') or timezone.now().date().strftime('%Y-%m'))
            account = resolve_target_account(request.user, request.query_params.get('account_id'))
        except (DjangoValidationError, FinancialAccount.DoesNotExist) as err:
            return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
        budgets = MonthlyBudget.objects.filter(user=request.user, account=account, month=month, is_active=True).select_related('category')
        total_spent = Transaction.objects.filter(
            account=account, transaction_type=Transaction.TransactionType.EXPENSE,
            is_voided=False, date__gte=month,
            date__lt=(month.replace(day=28) + timedelta(days=4)).replace(day=1)
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        overall = budgets.filter(category__isnull=True).first()
        return Response({
            'month': month.isoformat(),
            'account_id': str(account.id),
            'total_spent': f'{total_spent:.2f}',
            'overall': _budget_data(overall) if overall else None,
            'budgets': [_budget_data(budget) for budget in budgets],
        })

    serializer = MonthlyBudgetSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    try:
        account = resolve_target_account(request.user, request.data.get('account_id'))
        month = data['month'].replace(day=1)
        category = data.get('category')
        if category and not (category.user_id is None or category.user_id == request.user.id):
            raise DjangoValidationError("Category does not belong to this user.")
        if MonthlyBudget.objects.filter(account=account, month=month, category=category, is_active=True).exists():
            raise DjangoValidationError("An active budget already exists for this account, month, and category scope.")
        budget = MonthlyBudget.objects.create(user=request.user, account=account, month=month, category=category, amount=data['amount'])
    except (DjangoValidationError, FinancialAccount.DoesNotExist, IntegrityError) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else 'Duplicate active budget scope.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(_budget_data(budget), status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def budget_detail_view(request, pk):
    try:
        budget = MonthlyBudget.objects.get(pk=pk, user=request.user)
    except MonthlyBudget.DoesNotExist:
        return Response({'detail': 'Budget not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'DELETE':
        budget.delete()
        return Response({'message': 'Budget deleted.'})
    serializer = MonthlyBudgetSerializer(budget, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    month = data.get('month', budget.month).replace(day=1)
    category = data.get('category', budget.category)
    if category and not (category.user_id is None or category.user_id == request.user.id):
        return Response({'detail': 'Category does not belong to this user.'}, status=status.HTTP_400_BAD_REQUEST)
    if data.get('is_active', budget.is_active) and MonthlyBudget.objects.filter(
        account=budget.account, month=month, category=category, is_active=True
    ).exclude(pk=budget.pk).exists():
        return Response({'detail': 'An active budget already exists for this account, month, and category scope.'}, status=status.HTTP_400_BAD_REQUEST)
    for field in ['month', 'category', 'amount', 'is_active']:
        if field in data:
            setattr(budget, field, month if field == 'month' else data[field])
    budget.save()
    return Response(_budget_data(budget))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def recurring_expenses_view(request):
    if request.method == 'GET':
        templates = RecurringExpenseTemplate.objects.filter(
            user=request.user, deleted_at__isnull=True
        ).select_related('category').prefetch_related('occurrences')
        account_id = request.query_params.get('account_id')
        if account_id:
            templates = templates.filter(account_id=account_id)
        enabled = request.query_params.get('enabled')
        if enabled in ('true', 'false'):
            templates = templates.filter(enabled=enabled == 'true')
        return Response({'results': RecurringExpenseSerializer(templates, many=True).data, 'count': templates.count()})

    serializer = RecurringExpenseSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    if len(data['note'].strip()) < 3:
        return Response({'note': 'Note must contain at least 3 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        account = resolve_target_account(request.user, request.data.get('account_id'))
        category = data.get('category')
        if category and not (category.user_id is None or category.user_id == request.user.id):
            raise DjangoValidationError("Category does not belong to this user.")
        template = RecurringExpenseTemplate.objects.create(
            user=request.user, account=account, name=data['name'].strip(), amount=data['amount'],
            category=category, balance_type=data['balance_type'], frequency=data['frequency'],
            start_date=data['start_date'], next_due_date=data.get('next_due_date') or data['start_date'],
            end_date=data.get('end_date'), note=data['note'].strip(), enabled=data.get('enabled', True)
        )
    except (DjangoValidationError, FinancialAccount.DoesNotExist) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(RecurringExpenseSerializer(template).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def recurring_expense_detail_view(request, pk):
    try:
        template = RecurringExpenseTemplate.objects.get(pk=pk, user=request.user, deleted_at__isnull=True)
    except RecurringExpenseTemplate.DoesNotExist:
        return Response({'detail': 'Recurring expense not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'DELETE':
        template.enabled = False
        template.deleted_at = timezone.now()
        template.cancelled_at = timezone.now()
        template.save(update_fields=['enabled', 'deleted_at', 'cancelled_at', 'updated_at'])
        return Response({'message': 'Recurring expense cancelled.'})
    serializer = RecurringExpenseSerializer(template, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    if 'note' in data and len(data['note'].strip()) < 3:
        return Response({'note': 'Note must contain at least 3 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    for field, value in data.items():
        if field not in ['account', 'occurrences']:
            setattr(template, field, value.strip() if field in ['name', 'note'] else value)
    template.save()
    return Response(RecurringExpenseSerializer(template).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recurring_expense_record_view(request, pk):
    try:
        occurrence, template, txn, account = execute_record_recurring_expense(
            pk, request.user,
            datetime.strptime(request.data['scheduled_date'], '%Y-%m-%d').date()
            if request.data.get('scheduled_date') else None
        )
    except (DjangoValidationError, RecurringExpenseTemplate.DoesNotExist, KeyError, ValueError) as err:
        return Response({'detail': err.messages[0] if hasattr(err, 'messages') else str(err)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'occurrence': RecurringExpenseOccurrenceSerializer(occurrence).data,
        'recurring_expense': RecurringExpenseSerializer(template).data,
        'transaction': TransactionSerializer(txn).data,
        'account': FinancialAccountSerializer(account).data
    }, status=status.HTTP_201_CREATED)
