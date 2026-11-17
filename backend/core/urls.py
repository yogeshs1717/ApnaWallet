from django.urls import path
from .views import (
    account_detail_view,
    add_cash_view,
    categories_view,
    category_delete_view,
    csrf_token_view,
    expense_view,
    financial_accounts_view,
    health_check,
    login_view,
    logout_view,
    password_reset_confirm_view,
    password_reset_request_view,
    register_view,
    transaction_detail_view,
    transaction_list_view,
    transfer_view,
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

    # Financial Accounts
    path('accounts/', financial_accounts_view, name='financial_accounts'),
    path('accounts/<uuid:pk>/', account_detail_view, name='account_detail'),

    # Categories
    path('categories/', categories_view, name='categories'),
    path('categories/<uuid:pk>/', category_delete_view, name='category_delete'),

    # Transactions & Financial Operations
    path('transactions/', transaction_list_view, name='transaction_list'),
    path('transactions/<uuid:pk>/', transaction_detail_view, name='transaction_detail'),
    path('transactions/add-cash/', add_cash_view, name='add_cash'),
    path('transactions/expense/', expense_view, name='expense'),
    path('transactions/transfer/', transfer_view, name='transfer'),

    # Password Recovery
    path('auth/password-reset/', password_reset_request_view, name='password_reset_request'),
    path('auth/password-reset/confirm/', password_reset_confirm_view, name='password_reset_confirm'),
]
