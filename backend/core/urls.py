from django.urls import path
from .views import (
    csrf_token_view,
    financial_accounts_view,
    health_check,
    login_view,
    logout_view,
    password_reset_confirm_view,
    password_reset_request_view,
    register_view,
    user_profile_view,
)

urlpatterns = [
    # Baseline health check
    path('health/', health_check, name='health_check'),

    # Authentication & Session Management
    path('auth/csrf/', csrf_token_view, name='csrf_token'),
    path('auth/register/', register_view, name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/me/', user_profile_view, name='user_profile'),

    # Financial Accounts (Scoped to authenticated user)
    path('accounts/', financial_accounts_view, name='financial_accounts'),

    # Password Recovery Flow (Brevo / Console)
    path('auth/password-reset/', password_reset_request_view, name='password_reset_request'),
    path('auth/password-reset/confirm/', password_reset_confirm_view, name='password_reset_confirm'),
]
