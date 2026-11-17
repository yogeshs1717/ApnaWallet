from django.urls import path
from .views import (
    account_detail_view,
    add_cash_view,
    categories_view,
    category_delete_view,
    credit_detail_view,
    credit_list_view,
    credit_repay_view,
    csrf_token_view,
    expense_view,
    financial_accounts_view,
    health_check,
    lending_adjust_view,
    lending_detail_view,
    lending_list_view,
    lending_repay_view,
    login_view,
    logout_view,
    password_reset_confirm_view,
    password_reset_request_view,
    register_view,
    transaction_detail_view,
    transaction_list_view,
    transfer_view,
    user_profile_view,
    savings_goals_view,
    savings_deposit_view,
    savings_withdrawal_view,
    savings_goal_action_view,
    investments_view,
    investment_detail_view,
    budgets_view,
    budget_detail_view,
    recurring_expenses_view,
    recurring_expense_detail_view,
    recurring_expense_record_view,
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

    # Lending (Prompt 05)
    path('lending/', lending_list_view, name='lending_list'),
    path('lending/<uuid:pk>/', lending_detail_view, name='lending_detail'),
    path('lending/<uuid:pk>/repay/', lending_repay_view, name='lending_repay'),
    path('lending/<uuid:pk>/adjust/', lending_adjust_view, name='lending_adjust'),

    # Credit (Prompt 05)
    path('credit/', credit_list_view, name='credit_list'),
    path('credit/<uuid:pk>/', credit_detail_view, name='credit_detail'),
    path('credit/<uuid:pk>/repay/', credit_repay_view, name='credit_repay'),

    # Savings & Investments (Prompt 06)
    path('savings/', savings_goals_view, name='savings_goals'),
    path('savings/<uuid:pk>/deposit/', savings_deposit_view, name='savings_deposit'),
    path('savings/<uuid:pk>/withdraw/', savings_withdrawal_view, name='savings_withdrawal'),
    path('savings/<uuid:pk>/action/', savings_goal_action_view, name='savings_goal_action'),
    path('investments/', investments_view, name='investments'),
    path('investments/<uuid:pk>/', investment_detail_view, name='investment_detail'),

    # Budgets & recurring expenses (Prompt 07)
    path('budgets/', budgets_view, name='budgets'),
    path('budgets/<uuid:pk>/', budget_detail_view, name='budget_detail'),
    path('recurring-expenses/', recurring_expenses_view, name='recurring_expenses'),
    path('recurring-expenses/<uuid:pk>/', recurring_expense_detail_view, name='recurring_expense_detail'),
    path('recurring-expenses/<uuid:pk>/record/', recurring_expense_record_view, name='recurring_expense_record'),

    # Password Recovery
    path('auth/password-reset/', password_reset_request_view, name='password_reset_request'),
    path('auth/password-reset/confirm/', password_reset_confirm_view, name='password_reset_confirm'),
]
