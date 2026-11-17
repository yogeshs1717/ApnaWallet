from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.middleware.csrf import get_token
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import FinancialAccount, User
from .serializers import (
    FinancialAccountSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)


class PasswordResetThrottle(AnonRateThrottle):
    rate = '5/minute'


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint returning operational status of ApnaWallet backend.
    """
    return Response({
        "status": "ok",
        "application": "ApnaWallet"
    })


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    """
    Endpoint that ensures a CSRF cookie is set on the browser for secure POST requests.
    """
    token = get_token(request)
    return Response({"csrfToken": token})


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Registers a new user and automatically establishes their default 'Personal' financial account.
    Establishes an authenticated session immediately upon valid registration.
    """
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Automatically establish authenticated session with HttpOnly cookie
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
    """
    Authenticates a user via email and password, establishing an HttpOnly session.
    """
    serializer = LoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        profile_data = UserProfileSerializer(user).data
        return Response({
            "message": "Login successful.",
            "user": profile_data
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Terminates the user's active session and flushes the session store.
    """
    logout(request)
    return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    Returns the authenticated user's profile and default financial account.
    """
    serializer = UserProfileSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_accounts_view(request):
    """
    Returns list of financial accounts owned strictly by the authenticated user.
    Enforces multi-tenant data isolation at the ORM layer.
    """
    accounts = FinancialAccount.objects.filter(user=request.user)
    serializer = FinancialAccountSerializer(accounts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_request_view(request):
    """
    Generates a secure, time-limited, single-use password reset link.
    Security: Never reveals whether an email is registered to prevent user enumeration.
    """
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

        # Consistent response regardless of whether email exists
        return Response({
            "message": "If this email address is registered, a password reset link has been dispatched."
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    Validates token and allows setting a new password.
    Single-use guarantee: changing the password automatically invalidates the token.
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        uid_b64 = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "Reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password (this immediately invalidates this token for reuse)
        user.set_password(new_password)
        user.save()

        return Response(
            {"message": "Your password has been reset successfully. Please log in with your new credentials."},
            status=status.HTTP_200_OK
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
