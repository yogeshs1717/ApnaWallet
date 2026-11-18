from decimal import Decimal
from datetime import date, timedelta
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase
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
    RecurringExpenseOccurrence,
    Notification,
)
from .services import advance_recurring_date, user_local_date


class ApnaWalletSTQATestSuite(APITestCase):
    """
    Comprehensive STQA Automated Test Suite for ApnaWallet
    Covers:
      - Prompt 03: AUTH-01 through AUTH-14
      - Prompt 04: FIN-01 through FIN-20 (Financial Engine, Balances, Add Cash, Expense, Transfers, Search)
    """

    def setUp(self):
        cache.clear()
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.profile_url = reverse('user_profile')
        self.accounts_url = reverse('financial_accounts')
        self.add_cash_url = reverse('add_cash')
        self.expense_url = reverse('expense')
        self.transfer_url = reverse('transfer')
        self.transactions_url = reverse('transaction_list')
        self.categories_url = reverse('categories')
        self.pwd_reset_req_url = reverse('password_reset_request')
        self.pwd_reset_confirm_url = reverse('password_reset_confirm')
        self.lending_url = reverse('lending_list')
        self.credit_url = reverse('credit_list')

        # User 1 (Primary Test User)
        self.user1 = User.objects.create_user(
            email='aarav@example.com',
            password='SecurePassword@123',
            full_name='Aarav Sharma'
        )
        self.user1_account = FinancialAccount.objects.create(
            user=self.user1,
            name='Personal',
            is_default=True,
            cash_balance=Decimal('0.00'),
            bank_balance=Decimal('0.00')
        )

        # User 2 (Isolation Test User)
        self.user2 = User.objects.create_user(
            email='priya@example.com',
            password='AnotherSecurePassword#456',
            full_name='Priya Patel'
        )
        self.user2_account = FinancialAccount.objects.create(
            user=self.user2,
            name='Personal',
            is_default=True,
            cash_balance=Decimal('500.00'),
            bank_balance=Decimal('1000.00')
        )

    # =========================================================
    # PROMPT 03: AUTHENTICATION TESTS (AUTH-01 to AUTH-14)
    # =========================================================

    def test_auth_01_valid_registration(self):
        payload = {
            'full_name': 'Rohan Verma',
            'email': 'rohan@example.com',
            'password': 'ValidComplexPassword99!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['email'], 'rohan@example.com')

    def test_auth_02_duplicate_email_rejection(self):
        payload = {
            'full_name': 'Aarav Impostor',
            'email': 'aarav@example.com',
            'password': 'AnotherPassword123!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_auth_03_weak_password_rejection(self):
        payload = {'full_name': 'Weak', 'email': 'weak@example.com', 'password': '123'}
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_auth_04_correct_login(self):
        response = self.client.post(self.login_url, {
            'email': 'aarav@example.com',
            'password': 'SecurePassword@123'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_auth_05_incorrect_password(self):
        response = self.client.post(self.login_url, {
            'email': 'aarav@example.com',
            'password': 'WrongPassword!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_auth_06_logout(self):
        self.client.force_login(self.user1)
        res = self.client.post(self.logout_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_auth_07_protected_api_without_auth(self):
        res = self.client.get(self.accounts_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_auth_08_personal_account_created_automatically(self):
        res = self.client.post(self.register_url, {
            'full_name': 'Kavita Rao',
            'email': 'kavita@example.com',
            'password': 'ComplexPassword@789'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='kavita@example.com')
        self.assertTrue(FinancialAccount.objects.filter(user=new_user, name='Personal').exists())

    def test_auth_09_multi_tenant_isolation(self):
        self.client.force_login(self.user1)
        res = self.client.get(self.accounts_url)
        acc_ids = [a['id'] for a in res.data]
        self.assertIn(str(self.user1_account.id), acc_ids)
        self.assertNotIn(str(self.user2_account.id), acc_ids)

    def test_auth_10_password_reset_request(self):
        mail.outbox.clear()
        res = self.client.post(self.pwd_reset_req_url, {'email': self.user1.email}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

    def test_auth_11_valid_reset_link_success(self):
        uid = urlsafe_base64_encode(force_bytes(self.user1.pk))
        token = default_token_generator.make_token(self.user1)
        res = self.client.post(self.pwd_reset_confirm_url, {
            'uid': uid,
            'token': token,
            'new_password': 'NewlySetPassword#999'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_auth_12_invalid_reset_link_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user1.pk))
        res = self.client.post(self.pwd_reset_confirm_url, {
            'uid': uid,
            'token': 'invalid-token',
            'new_password': 'NewlySetPassword#999'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_auth_13_reused_reset_link_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user1.pk))
        token = default_token_generator.make_token(self.user1)
        res1 = self.client.post(self.pwd_reset_confirm_url, {
            'uid': uid,
            'token': token,
            'new_password': 'FirstResetPassword#111'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        res2 = self.client.post(self.pwd_reset_confirm_url, {
            'uid': uid,
            'token': token,
            'new_password': 'SecondResetPassword#222'
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_auth_14_password_reset_rate_limiting(self):
        cache.clear()
        payload = {'email': self.user1.email}
        statuses = []
        for _ in range(6):
            statuses.append(self.client.post(self.pwd_reset_req_url, payload, format='json').status_code)
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, statuses)

    # =========================================================
    # PROMPT 04: FINANCIAL ENGINE TESTS (FIN-01 to FIN-20)
    # =========================================================

    def test_fin_01_add_1000_to_cash(self):
        """FIN-01: Add ₹1,000 to Cash balance"""
        self.client.force_login(self.user1)
        payload = {
            'account_id': str(self.user1_account.id),
            'amount': '1000.00',
            'balance_type': 'CASH',
            'note': 'Pocket Money from Dad'
        }
        res = self.client.post(self.add_cash_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('1000.00'))
        self.assertEqual(self.user1_account.total_balance, Decimal('1000.00'))

    def test_fin_02_add_500_to_bank(self):
        """FIN-02: Add ₹500 to Bank balance"""
        self.client.force_login(self.user1)
        payload = {
            'account_id': str(self.user1_account.id),
            'amount': '500.00',
            'balance_type': 'BANK',
            'note': 'Freelance payment'
        }
        res = self.client.post(self.add_cash_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.bank_balance, Decimal('500.00'))
        self.assertEqual(self.user1_account.total_balance, Decimal('500.00'))

    def test_fin_03_spend_200_from_cash(self):
        """FIN-03: Spend ₹200 from Cash balance"""
        self.client.force_login(self.user1)
        # Preload ₹1000 cash
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        payload = {
            'account_id': str(self.user1_account.id),
            'amount': '200.00',
            'balance_type': 'CASH',
            'note': 'Grocery items'
        }
        res = self.client.post(self.expense_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('800.00'))

    def test_fin_04_transfer_300_from_cash_to_bank(self):
        """FIN-04: Transfer ₹300 from Cash to Bank"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('800.00')
        self.user1_account.bank_balance = Decimal('500.00')
        self.user1_account.save()

        payload = {
            'account_id': str(self.user1_account.id),
            'amount': '300.00',
            'source_balance_type': 'CASH',
            'destination_balance_type': 'BANK',
            'note': 'ATM Cash Deposit'
        }
        res = self.client.post(self.transfer_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('500.00'))
        self.assertEqual(self.user1_account.bank_balance, Decimal('800.00'))

    def test_fin_05_verify_available_balance_after_transfer(self):
        """FIN-05: Available Balance remains constant after internal transfer"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.bank_balance = Decimal('2000.00')
        self.user1_account.save()
        initial_total = self.user1_account.total_balance  # ₹3000

        payload = {
            'account_id': str(self.user1_account.id),
            'amount': '750.00',
            'source_balance_type': 'CASH',
            'destination_balance_type': 'BANK',
            'note': 'Shift money to Bank'
        }
        res = self.client.post(self.transfer_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.total_balance, initial_total)

    def test_fin_06_reject_negative_or_zero_amounts(self):
        """FIN-06: Reject zero or negative monetary inputs"""
        self.client.force_login(self.user1)
        # Zero
        res0 = self.client.post(self.add_cash_url, {
            'amount': '0.00',
            'balance_type': 'CASH',
            'note': 'Zero test'
        }, format='json')
        self.assertEqual(res0.status_code, status.HTTP_400_BAD_REQUEST)

        # Negative
        res_neg = self.client.post(self.expense_url, {
            'amount': '-50.00',
            'balance_type': 'CASH',
            'note': 'Negative test'
        }, format='json')
        self.assertEqual(res_neg.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fin_07_reject_notes_shorter_than_3_characters(self):
        """FIN-07: Reject notes shorter than 3 trimmed characters"""
        self.client.force_login(self.user1)
        res = self.client.post(self.add_cash_url, {
            'amount': '100.00',
            'balance_type': 'CASH',
            'note': ' Hi '  # 2 characters when trimmed
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('note', res.data)

    def test_fin_08_accept_tea_as_valid_note(self):
        """FIN-08: Accept 'Tea' as a valid note (exactly 3 characters)"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('100.00')
        self.user1_account.save()

        res = self.client.post(self.expense_url, {
            'amount': '15.00',
            'balance_type': 'CASH',
            'note': 'Tea'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('85.00'))

    def test_fin_09_reject_expenses_exceeding_balance(self):
        """FIN-09: Reject expense if amount exceeds available source balance"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('50.00')
        self.user1_account.save()

        res = self.client.post(self.expense_url, {
            'amount': '100.00',  # Exceeds 50.00
            'balance_type': 'CASH',
            'note': 'Dinner with friends'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient funds', res.data['detail'])

    def test_fin_10_expense_editing_adjusts_balance_correctly(self):
        """FIN-10: Editing expense from ₹200 to ₹300 deducts additional ₹100"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('500.00')
        self.user1_account.save()

        # Step 1: Create ₹200 expense (balance becomes ₹300)
        res1 = self.client.post(self.expense_url, {
            'amount': '200.00',
            'balance_type': 'CASH',
            'note': 'Lunch party'
        }, format='json')
        txn_id = res1.data['transaction']['id']
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('300.00'))

        # Step 2: Edit amount to ₹300 (balance should become ₹200)
        edit_url = reverse('transaction_detail', kwargs={'pk': txn_id})
        res2 = self.client.patch(edit_url, {'amount': '300.00'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('200.00'))

    def test_fin_11_void_reversal_restores_balance(self):
        """FIN-11: Voiding an expense restores the deducted funds"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('400.00')
        self.user1_account.save()

        # Create expense
        res = self.client.post(self.expense_url, {
            'amount': '150.00',
            'balance_type': 'CASH',
            'note': 'Books purchase'
        }, format='json')
        txn_id = res.data['transaction']['id']
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('250.00'))

        # Void transaction
        detail_url = reverse('transaction_detail', kwargs={'pk': txn_id})
        void_res = self.client.delete(detail_url)
        self.assertEqual(void_res.status_code, status.HTTP_200_OK)
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('400.00'))

    def test_fin_12_prevent_access_to_another_users_transactions(self):
        """FIN-12: User 1 cannot view or edit User 2's transactions"""
        # User 2 creates transaction
        txn_user2 = Transaction.objects.create(
            account=self.user2_account,
            transaction_type='EXPENSE',
            amount=Decimal('100.00'),
            balance_type='CASH',
            note='Secret User 2 expense'
        )

        # User 1 attempts to access it
        self.client.force_login(self.user1)
        detail_url = reverse('transaction_detail', kwargs={'pk': txn_user2.pk})
        res = self.client.delete(detail_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_fin_13_account_switching_isolates_balances(self):
        """FIN-13: Multiple accounts per user maintain separate isolated balances"""
        self.client.force_login(self.user1)
        # Create second account for User 1
        business_account = FinancialAccount.objects.create(
            user=self.user1,
            name='Business',
            is_default=False,
            cash_balance=Decimal('5000.00'),
            bank_balance=Decimal('10000.00')
        )

        # Deposit into Business
        self.client.post(self.add_cash_url, {
            'account_id': str(business_account.id),
            'amount': '2000.00',
            'balance_type': 'BANK',
            'note': 'Client invoice paid'
        }, format='json')

        business_account.refresh_from_db()
        self.user1_account.refresh_from_db()

        self.assertEqual(business_account.bank_balance, Decimal('12000.00'))
        self.assertEqual(self.user1_account.bank_balance, Decimal('0.00'))

    def test_fin_14_transfer_does_not_count_as_income_or_expense(self):
        """FIN-14: Transfer is classified as TRANSFER, distinct from ADD_CASH or EXPENSE"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        res = self.client.post(self.transfer_url, {
            'account_id': str(self.user1_account.id),
            'amount': '500.00',
            'source_balance_type': 'CASH',
            'destination_balance_type': 'BANK',
            'note': 'Deposit to savings'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        txn = Transaction.objects.get(pk=res.data['transaction']['id'])
        self.assertEqual(txn.transaction_type, Transaction.TransactionType.TRANSFER)
        self.assertNotEqual(txn.transaction_type, Transaction.TransactionType.ADD_CASH)
        self.assertNotEqual(txn.transaction_type, Transaction.TransactionType.EXPENSE)

    def test_fin_15_transaction_search_and_filtering(self):
        """FIN-15: Filter transactions by note keyword and type"""
        self.client.force_login(self.user1)
        Transaction.objects.create(
            account=self.user1_account,
            transaction_type='EXPENSE',
            amount=Decimal('45.00'),
            balance_type='CASH',
            note='Starbucks Coffee'
        )
        Transaction.objects.create(
            account=self.user1_account,
            transaction_type='EXPENSE',
            amount=Decimal('1200.00'),
            balance_type='BANK',
            note='Electricity Bill'
        )

        # Search for "Coffee"
        res = self.client.get(self.transactions_url, {'search': 'Coffee'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertIn('Coffee', res.data['results'][0]['note'])

    def test_fin_16_repeated_submission_idempotency_validation(self):
        """FIN-16: Reject identical transfer with same source and destination"""
        self.client.force_login(self.user1)
        res = self.client.post(self.transfer_url, {
            'amount': '100.00',
            'source_balance_type': 'CASH',
            'destination_balance_type': 'CASH',  # Same!
            'note': 'Invalid internal transfer'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fin_17_category_soft_deletion_preserves_history(self):
        """FIN-19: Archiving a category sets is_active=False without deleting transactions"""
        self.client.force_login(self.user1)
        category = Category.objects.create(user=self.user1, name='Freelance Fun')
        txn = Transaction.objects.create(
            account=self.user1_account,
            transaction_type='EXPENSE',
            amount=Decimal('50.00'),
            balance_type='CASH',
            category=category,
            note='Theme park'
        )

        # Delete category
        del_url = reverse('category_delete', kwargs={'pk': category.pk})
        del_res = self.client.delete(del_url)
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)

        category.refresh_from_db()
        self.assertFalse(category.is_active)
        # Transaction still exists and points to category
        txn.refresh_from_db()
        self.assertEqual(txn.category.id, category.id)

    def test_fin_18_transfer_atomic_rollback_on_failure(self):
        """FIN-20: Ensure database transaction rolls back if transfer balance check fails"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('100.00')
        self.user1_account.bank_balance = Decimal('200.00')
        self.user1_account.save()

        # Attempt to transfer ₹500 (exceeds ₹100 cash)
        res = self.client.post(self.transfer_url, {
            'amount': '500.00',
            'source_balance_type': 'CASH',
            'destination_balance_type': 'BANK',
            'note': 'Failed overdraw transfer'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify neither balance was touched
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('100.00'))
        self.assertEqual(self.user1_account.bank_balance, Decimal('200.00'))

    # ==========================================================================
    # PROMPT 05: LENDING TESTS (LEND-01 to LEND-14)
    # ==========================================================================

    def test_lend_01_create_valid_lending_record(self):
        """LEND-01: Create a valid lending record"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        res = self.client.post(self.lending_url, {
            'borrower_name': 'Rohan Verma',
            'amount': '500.00',
            'balance_type': 'CASH',
            'note': 'Semester fee help'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data['lending']['borrower_name'], 'Rohan Verma')
        self.assertEqual(data['lending']['original_amount'], '500.00')
        self.assertEqual(data['lending']['outstanding_amount'], '500.00')
        self.assertEqual(data['lending']['status'], 'UNPAID')

    def test_lend_02_deduct_lending_amount_from_cash(self):
        """LEND-02: Deduct lending amount from Cash balance"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('2000.00')
        self.user1_account.save()

        res = self.client.post(self.lending_url, {
            'borrower_name': 'Ranjan',
            'amount': '500.00',
            'balance_type': 'CASH',
            'note': 'Emergency loan'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('1500.00'))

    def test_lend_03_deduct_lending_amount_from_bank(self):
        """LEND-03: Deduct lending amount from Bank balance"""
        self.client.force_login(self.user1)
        self.user1_account.bank_balance = Decimal('3000.00')
        self.user1_account.save()

        res = self.client.post(self.lending_url, {
            'borrower_name': 'Sunita',
            'amount': '1200.00',
            'balance_type': 'BANK',
            'note': 'Online transfer'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.bank_balance, Decimal('1800.00'))

    def test_lend_04_reject_lending_insufficient_funds(self):
        """LEND-04: Reject lending with insufficient funds"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('200.00')
        self.user1_account.save()

        res = self.client.post(self.lending_url, {
            'borrower_name': 'Vikram',
            'amount': '500.00',
            'balance_type': 'CASH',
            'note': 'Too much loan'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('200.00'))

    def test_lend_05_record_partial_repayment(self):
        """LEND-05: Record a partial repayment (Ranjan owes ₹500, pays ₹300)"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('2000.00')
        self.user1_account.save()

        # Lend ₹500
        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Ranjan',
            'amount': '500.00',
            'balance_type': 'CASH',
            'note': 'Trip'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        # Repay ₹300
        repay_url = reverse('lending_repay', kwargs={'pk': lending_id})
        res = self.client.post(repay_url, {
            'amount': '300.00',
            'balance_type': 'CASH',
            'note': 'Ranjan paid ₹300'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()
        self.assertEqual(data['lending']['outstanding_amount'], '200.00')
        self.assertEqual(data['lending']['amount_repaid'], '300.00')
        self.assertEqual(data['lending']['status'], 'PARTIALLY_PAID')

        self.user1_account.refresh_from_db()
        # Initial 2000 - 500 + 300 = 1800
        self.assertEqual(self.user1_account.cash_balance, Decimal('1800.00'))

    def test_lend_06_record_full_repayment(self):
        """LEND-06: Record a full repayment (Status becomes FULLY_PAID, outstanding ₹0)"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Ankit',
            'amount': '500.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        repay_url = reverse('lending_repay', kwargs={'pk': lending_id})
        res = self.client.post(repay_url, {
            'amount': '500.00',
            'balance_type': 'BANK'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()
        self.assertEqual(data['lending']['outstanding_amount'], '0.00')
        self.assertEqual(data['lending']['status'], 'FULLY_PAID')

        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.bank_balance, Decimal('500.00'))

    def test_lend_07_reject_repayment_exceeding_outstanding(self):
        """LEND-07: Reject repayment exceeding outstanding amount"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Neha',
            'amount': '500.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        repay_url = reverse('lending_repay', kwargs={'pk': lending_id})
        # Try to repay ₹600 on ₹500 debt
        res = self.client.post(repay_url, {
            'amount': '600.00',
            'balance_type': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lend_08_verify_lending_repayment_not_counted_as_income(self):
        """LEND-08: Verify lending repayment creates LENDING_REPAYMENT transaction (not ADD_CASH)"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Pooja',
            'amount': '400.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        repay_url = reverse('lending_repay', kwargs={'pk': lending_id})
        res = self.client.post(repay_url, {
            'amount': '400.00',
            'balance_type': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        txn_data = res.json()['transaction']
        self.assertEqual(txn_data['transaction_type'], 'LENDING_REPAYMENT')
        self.assertNotEqual(txn_data['transaction_type'], 'ADD_CASH')

    def test_lend_09_verify_automatic_note_ranjan_paid_300(self):
        """LEND-09: Verify automatic note 'Ranjan paid ₹300' when note is empty"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Ranjan',
            'amount': '500.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        repay_url = reverse('lending_repay', kwargs={'pk': lending_id})
        res = self.client.post(repay_url, {
            'amount': '300.00',
            'balance_type': 'CASH',
            'note': ''
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['transaction']['note'], 'Ranjan paid ₹300')

    def test_lend_10_edit_borrower_details_without_changing_balances(self):
        """LEND-10: Edit borrower details without changing balances"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Ranjan',
            'amount': '500.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        detail_url = reverse('lending_detail', kwargs={'pk': lending_id})
        res = self.client.patch(detail_url, {
            'borrower_name': 'Ranjan Sharma',
            'notes': 'Roommate'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['lending']['borrower_name'], 'Ranjan Sharma')

        # Balance remains 1000 - 500 = 500
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('500.00'))

    def test_lend_11_adjust_outstanding_amount_without_creating_fake_cash(self):
        """LEND-11: Adjust outstanding amount without creating fake cash"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Ranjan',
            'amount': '500.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        adjust_url = reverse('lending_adjust', kwargs={'pk': lending_id})
        res = self.client.post(adjust_url, {
            'new_outstanding_amount': '350.00',
            'reason': 'Settlement discount'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()['lending']['outstanding_amount'], '350.00')

        # Cash balance was NOT increased by ₹150
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('500.00'))

    def test_lend_12_prevent_duplicate_repayments(self):
        """LEND-12: Prevent duplicate repayments on fully paid loans"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Aman',
            'amount': '500.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        repay_url = reverse('lending_repay', kwargs={'pk': lending_id})
        # Full repayment
        self.client.post(repay_url, {'amount': '500.00', 'balance_type': 'CASH'}, format='json')

        # Attempt duplicate repayment
        dup_res = self.client.post(repay_url, {'amount': '500.00', 'balance_type': 'CASH'}, format='json')
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lend_13_cross_user_access_denied(self):
        """LEND-13: Verify cross-user access to lending records is denied"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Private Borrower',
            'amount': '300.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        # User 2 attempts to access User 1's lending record
        self.client.force_login(self.user2)
        detail_url = reverse('lending_detail', kwargs={'pk': lending_id})
        res = self.client.get(detail_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        repay_url = reverse('lending_repay', kwargs={'pk': lending_id})
        repay_res = self.client.post(repay_url, {'amount': '100.00', 'balance_type': 'CASH'}, format='json')
        self.assertEqual(repay_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_lend_14_concurrent_repayments_cannot_overpay(self):
        """LEND-14: Consecutive/concurrent repayments cannot overpay beyond outstanding amount"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.save()

        lend_res = self.client.post(self.lending_url, {
            'borrower_name': 'Kavita',
            'amount': '500.00',
            'balance_type': 'CASH'
        }, format='json')
        lending_id = lend_res.json()['lending']['id']

        repay_url = reverse('lending_repay', kwargs={'pk': lending_id})
        # Repay 300 (200 left)
        res1 = self.client.post(repay_url, {'amount': '300.00', 'balance_type': 'CASH'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Attempting another 300 should fail because only 200 is outstanding
        res2 = self.client.post(repay_url, {'amount': '300.00', 'balance_type': 'CASH'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    # ==========================================================================
    # PROMPT 05: CREDIT TESTS (CREDIT-01 to CREDIT-13)
    # ==========================================================================

    def test_credit_01_record_existing_debt_without_changing_cash_bank(self):
        """CREDIT-01: Record an existing debt without changing Cash/Bank"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('1000.00')
        self.user1_account.bank_balance = Decimal('2000.00')
        self.user1_account.save()

        res = self.client.post(self.credit_url, {
            'creditor_name': 'Sharma Ji Store',
            'amount': '5000.00',
            'description': 'Grocery tab',
            'receive_funds': False
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertEqual(data['credit']['creditor_name'], 'Sharma Ji Store')
        self.assertEqual(data['credit']['outstanding_amount'], '5000.00')
        self.assertFalse(data['credit']['funds_received'])

        # Verify Cash and Bank are untouched
        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('1000.00'))
        self.assertEqual(self.user1_account.bank_balance, Decimal('2000.00'))

    def test_credit_02_record_borrowed_funds_received_into_cash(self):
        """CREDIT-02: Record borrowed funds received into Cash"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('500.00')
        self.user1_account.save()

        res = self.client.post(self.credit_url, {
            'creditor_name': 'HDFC Personal Loan',
            'amount': '1000.00',
            'description': 'Quick cash loan',
            'receive_funds': True,
            'destination_balance_type': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.user1_account.refresh_from_db()
        # 500 + 1000 = 1500
        self.assertEqual(self.user1_account.cash_balance, Decimal('1500.00'))

    def test_credit_03_verify_borrowed_funds_not_counted_as_income(self):
        """CREDIT-03: Verify borrowed funds create CREDIT transaction (not ADD_CASH)"""
        self.client.force_login(self.user1)
        res = self.client.post(self.credit_url, {
            'creditor_name': 'Manoj Friend',
            'amount': '800.00',
            'receive_funds': True,
            'destination_balance_type': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        txn_data = res.json()['transaction']
        self.assertEqual(txn_data['transaction_type'], 'CREDIT')
        self.assertNotEqual(txn_data['transaction_type'], 'ADD_CASH')

    def test_credit_04_record_partial_credit_repayment(self):
        """CREDIT-04: Record partial credit repayment (debt ₹1000, repay ₹400)"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('2000.00')
        self.user1_account.save()

        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Deepak',
            'amount': '1000.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        repay_url = reverse('credit_repay', kwargs={'pk': credit_id})
        res = self.client.post(repay_url, {
            'amount': '400.00',
            'payment_source': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()
        self.assertEqual(data['credit']['outstanding_amount'], '600.00')
        self.assertEqual(data['credit']['amount_repaid'], '400.00')
        self.assertEqual(data['credit']['status'], 'PARTIALLY_PAID')

        self.user1_account.refresh_from_db()
        # 2000 - 400 = 1600
        self.assertEqual(self.user1_account.cash_balance, Decimal('1600.00'))

    def test_credit_05_record_full_credit_repayment(self):
        """CREDIT-05: Record full credit repayment (status becomes FULLY_PAID)"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('2000.00')
        self.user1_account.save()

        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Aarav Shop',
            'amount': '1000.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        repay_url = reverse('credit_repay', kwargs={'pk': credit_id})
        res = self.client.post(repay_url, {
            'amount': '1000.00',
            'payment_source': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.json()
        self.assertEqual(data['credit']['outstanding_amount'], '0.00')
        self.assertEqual(data['credit']['status'], 'FULLY_PAID')

        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('1000.00'))

    def test_credit_06_reject_credit_repayment_insufficient_funds(self):
        """CREDIT-06: Reject credit repayment with insufficient funds"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('200.00')
        self.user1_account.save()

        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Anand',
            'amount': '1000.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        repay_url = reverse('credit_repay', kwargs={'pk': credit_id})
        # Try to pay ₹500 when Cash is only ₹200
        res = self.client.post(repay_url, {
            'amount': '500.00',
            'payment_source': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('200.00'))

    def test_credit_07_reject_credit_overpayment(self):
        """CREDIT-07: Reject credit overpayment beyond outstanding balance"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('2000.00')
        self.user1_account.save()

        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Prashant',
            'amount': '400.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        repay_url = reverse('credit_repay', kwargs={'pk': credit_id})
        # Try to pay ₹500 on ₹400 debt
        res = self.client.post(repay_url, {
            'amount': '500.00',
            'payment_source': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_credit_08_verify_principal_repayment_not_counted_as_expense(self):
        """CREDIT-08: Verify principal repayment creates CREDIT_REPAYMENT transaction (not EXPENSE)"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('2000.00')
        self.user1_account.save()

        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Kunal',
            'amount': '300.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        repay_url = reverse('credit_repay', kwargs={'pk': credit_id})
        res = self.client.post(repay_url, {
            'amount': '300.00',
            'payment_source': 'CASH'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        txn_data = res.json()['transaction']
        self.assertEqual(txn_data['transaction_type'], 'CREDIT_REPAYMENT')
        self.assertNotEqual(txn_data['transaction_type'], 'EXPENSE')

    def test_credit_09_verify_optional_pay_by_date(self):
        """CREDIT-09: Verify optional Pay By Date and overdue detection"""
        self.client.force_login(self.user1)

        # No due date -> is_overdue False
        res1 = self.client.post(self.credit_url, {
            'creditor_name': 'No Due Creditor',
            'amount': '500.00'
        }, format='json')
        self.assertFalse(res1.json()['credit']['is_overdue'])
        self.assertIsNone(res1.json()['credit']['pay_by_date'])

        # Past due date -> is_overdue True
        yesterday = (timezone.now() - timezone.timedelta(days=1)).date().isoformat()
        res2 = self.client.post(self.credit_url, {
            'creditor_name': 'Past Due Creditor',
            'amount': '500.00',
            'pay_by_date': yesterday
        }, format='json')
        self.assertTrue(res2.json()['credit']['is_overdue'])

    def test_credit_10_verify_due_date_can_be_updated(self):
        """CREDIT-10: Verify due date can be added or updated via PATCH"""
        self.client.force_login(self.user1)
        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Rakesh',
            'amount': '1500.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        detail_url = reverse('credit_detail', kwargs={'pk': credit_id})
        future_date = (timezone.now() + timezone.timedelta(days=30)).date().isoformat()
        patch_res = self.client.patch(detail_url, {
            'pay_by_date': future_date
        }, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.json()['credit']['pay_by_date'], future_date)

    def test_credit_11_cross_user_access_denied(self):
        """CREDIT-11: Verify cross-user access to credit records is denied"""
        self.client.force_login(self.user1)
        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Private Creditor',
            'amount': '700.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        # User 2 tries to access User 1's credit
        self.client.force_login(self.user2)
        detail_url = reverse('credit_detail', kwargs={'pk': credit_id})
        res = self.client.get(detail_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        repay_url = reverse('credit_repay', kwargs={'pk': credit_id})
        repay_res = self.client.post(repay_url, {'amount': '100.00', 'payment_source': 'CASH'}, format='json')
        self.assertEqual(repay_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_credit_12_transaction_rollback_on_failed_repayment(self):
        """CREDIT-12: Transaction rolls back on failed repayment (balance unchanged)"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('100.00')
        self.user1_account.save()

        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Creditor X',
            'amount': '500.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        repay_url = reverse('credit_repay', kwargs={'pk': credit_id})
        # Fails due to insufficient cash (₹100 available, ₹200 requested)
        res = self.client.post(repay_url, {'amount': '200.00', 'payment_source': 'CASH'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        self.user1_account.refresh_from_db()
        self.assertEqual(self.user1_account.cash_balance, Decimal('100.00'))

    def test_credit_13_duplicate_repayment_protection(self):
        """CREDIT-13: Duplicate repayment on fully paid credit is rejected"""
        self.client.force_login(self.user1)
        self.user1_account.cash_balance = Decimal('2000.00')
        self.user1_account.save()

        credit_res = self.client.post(self.credit_url, {
            'creditor_name': 'Creditor Y',
            'amount': '500.00'
        }, format='json')
        credit_id = credit_res.json()['credit']['id']

        repay_url = reverse('credit_repay', kwargs={'pk': credit_id})
        self.client.post(repay_url, {'amount': '500.00', 'payment_source': 'CASH'}, format='json')

        # Second attempt
        dup_res = self.client.post(repay_url, {'amount': '500.00', 'payment_source': 'CASH'}, format='json')
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)


class Prompt06SavingsInvestmentTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='saver@example.com', password='SecurePassword@123', full_name='Saver')
        self.account = FinancialAccount.objects.create(user=self.user, name='Personal', is_default=True,
                                                       cash_balance=Decimal('5000.00'), bank_balance=Decimal('0.00'))
        self.client.force_login(self.user)

    def test_savings_deposit_and_withdrawal_update_available_balance(self):
        goal = self.client.post(reverse('savings_goals'), {'name': 'Emergency Fund', 'target_amount': '2000.00'}, format='json')
        self.assertEqual(goal.status_code, status.HTTP_201_CREATED)
        goal_id = goal.json()['id']
        deposit = self.client.post(reverse('savings_deposit', kwargs={'pk': goal_id}),
                                   {'amount': '1000.00', 'balance_type': 'CASH'}, format='json')
        self.assertEqual(deposit.status_code, status.HTTP_200_OK)
        self.account.refresh_from_db()
        self.assertEqual(self.account.cash_balance, Decimal('4000.00'))
        withdrawal = self.client.post(reverse('savings_withdrawal', kwargs={'pk': goal_id}),
                                      {'amount': '300.00', 'balance_type': 'CASH'}, format='json')
        self.assertEqual(withdrawal.status_code, status.HTTP_200_OK)
        self.account.refresh_from_db()
        self.assertEqual(self.account.cash_balance, Decimal('4300.00'))

    def test_only_one_active_goal_and_insufficient_deposit_rolls_back(self):
        first = self.client.post(reverse('savings_goals'), {'name': 'Goal 1', 'target_amount': '1000.00'}, format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(reverse('savings_goals'), {'name': 'Goal 2', 'target_amount': '1000.00'}, format='json')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        failed = self.client.post(reverse('savings_deposit', kwargs={'pk': first.json()['id']}),
                                  {'amount': '6000.00', 'balance_type': 'CASH'}, format='json')
        self.assertEqual(failed.status_code, status.HTTP_400_BAD_REQUEST)
        self.account.refresh_from_db()
        self.assertEqual(self.account.cash_balance, Decimal('5000.00'))

    def test_investment_purchase_and_partial_sale_track_cost_basis_and_gain(self):
        purchase = self.client.post(reverse('investments'), {
            'name': 'Index Fund', 'investment_type': 'MUTUAL_FUNDS', 'amount': '1000.00',
            'platform': 'Broker', 'balance_type': 'CASH'
        }, format='json')
        self.assertEqual(purchase.status_code, status.HTTP_201_CREATED)
        investment_id = purchase.json()['investment']['id']
        sale = self.client.post(reverse('investment_detail', kwargs={'pk': investment_id}), {
            'cost_basis_sold': '400.00', 'proceeds': '450.00', 'balance_type': 'CASH'
        }, format='json')
        self.assertEqual(sale.status_code, status.HTTP_200_OK)
        self.assertEqual(sale.json()['sale']['realized_gain_loss'], '50.00')
        self.assertEqual(sale.json()['investment']['cost_basis'], '600.00')
        self.account.refresh_from_db()
        self.assertEqual(self.account.cash_balance, Decimal('4450.00'))

    def test_investment_separate_does_not_affect_main_balance(self):
        initial_cash = self.account.cash_balance
        initial_bank = self.account.bank_balance
        purchase = self.client.post(reverse('investments'), {
            'name': 'Gold Paytm', 'investment_type': 'GOLD', 'amount': '450.00',
            'platform': 'Paytm', 'link_to_balance': False, 'separate': True
        }, format='json')
        self.assertEqual(purchase.status_code, status.HTTP_201_CREATED)
        self.account.refresh_from_db()
        self.assertEqual(self.account.cash_balance, initial_cash)
        self.assertEqual(self.account.bank_balance, initial_bank)
        self.assertIsNone(purchase.json()['transaction'])

    def test_delete_investment_asset(self):
        purchase = self.client.post(reverse('investments'), {
            'name': 'Gold Delete Test', 'investment_type': 'GOLD', 'amount': '500.00',
            'platform': 'Paytm', 'link_to_balance': False
        }, format='json')
        self.assertEqual(purchase.status_code, status.HTTP_201_CREATED)
        inv_id = purchase.json()['investment']['id']
        list_resp = self.client.get(reverse('investments'))
        self.assertEqual(Decimal(list_resp.json()['total_invested']), Decimal('500.00'))
        del_resp = self.client.delete(reverse('investment_detail', kwargs={'pk': inv_id}))
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        list_resp2 = self.client.get(reverse('investments'))
        self.assertEqual(Decimal(list_resp2.json()['total_invested']), Decimal('0.00'))
        self.assertEqual(len(list_resp2.json()['investments']), 0)

    def test_cross_user_savings_access_denied(self):
        goal = self.client.post(reverse('savings_goals'), {'name': 'Private', 'target_amount': '100.00'}, format='json')
        other = User.objects.create_user(email='other@example.com', password='SecurePassword@123', full_name='Other')
        self.client.force_login(other)
        response = self.client.post(reverse('savings_deposit', kwargs={'pk': goal.json()['id']}),
                                    {'amount': '10.00', 'balance_type': 'CASH'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class Prompt07BudgetRecurringTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='budget@example.com', password='SecurePassword@123', full_name='Budget User')
        self.other_user = User.objects.create_user(email='budget-other@example.com', password='SecurePassword@123', full_name='Other')
        self.account = FinancialAccount.objects.create(user=self.user, name='Personal', is_default=True,
                                                       cash_balance=Decimal('1000.00'), bank_balance=Decimal('1000.00'))
        self.category = Category.objects.create(user=self.user, name='Bills')
        self.client.force_login(self.user)
        self.month = timezone.now().date().replace(day=1).strftime('%Y-%m')

    def create_expense(self, amount, category=None):
        return self.client.post(reverse('expense'), {
            'account_id': str(self.account.id), 'amount': str(amount), 'balance_type': 'CASH',
            'note': 'Budget test expense', **({'category_id': str(category.id)} if category else {})
        }, format='json')

    def test_bud_01_create_and_calculate_budget_from_expenses(self):
        response = self.client.post(reverse('budgets'), {
            'account_id': str(self.account.id), 'month': f'{self.month}-01', 'amount': '500.00'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.create_expense(100)
        summary = self.client.get(reverse('budgets'), {'account_id': str(self.account.id), 'month': self.month})
        self.assertEqual(summary.json()['overall']['spent'], '100.00')

    def test_bud_03_and_04_warning_at_and_above_100_percent(self):
        self.client.post(reverse('budgets'), {'account_id': str(self.account.id), 'month': f'{self.month}-01', 'amount': '100.00'}, format='json')
        self.create_expense(100)
        exact = self.client.get(reverse('budgets'), {'account_id': str(self.account.id), 'month': self.month}).json()['overall']
        self.assertTrue(exact['warning'])
        self.create_expense(50)
        above = self.client.get(reverse('budgets'), {'account_id': str(self.account.id), 'month': self.month}).json()['overall']
        self.assertEqual(above['usage_percentage'], '150.00')
        self.assertTrue(above['warning'])

    def test_bud_05_no_budget_has_no_warning_and_bud_06_non_expenses_excluded(self):
        Transaction.objects.create(account=self.account, transaction_type=Transaction.TransactionType.TRANSFER,
                                   amount=Decimal('100.00'), balance_type='CASH', destination_balance_type='BANK', note='Transfer')
        Transaction.objects.create(account=self.account, transaction_type=Transaction.TransactionType.LENDING,
                                   amount=Decimal('100.00'), balance_type='CASH', note='Lending')
        response = self.client.get(reverse('budgets'), {'account_id': str(self.account.id), 'month': self.month})
        self.assertIsNone(response.json()['overall'])
        self.assertEqual(response.json()['total_spent'], '0.00')

    def test_bud_07_recalculate_after_edit_and_void(self):
        self.client.post(reverse('budgets'), {'account_id': str(self.account.id), 'month': f'{self.month}-01', 'amount': '500.00'}, format='json')
        transaction_id = self.create_expense(100).json()['transaction']['id']
        detail = reverse('transaction_detail', kwargs={'pk': transaction_id})
        self.client.patch(detail, {'amount': '200.00'}, format='json')
        self.assertEqual(self.client.get(reverse('budgets'), {'account_id': str(self.account.id), 'month': self.month}).json()['overall']['spent'], '200.00')
        self.client.delete(detail)
        self.assertEqual(self.client.get(reverse('budgets'), {'account_id': str(self.account.id), 'month': self.month}).json()['overall']['spent'], '0.00')

    def test_bud_08_duplicate_active_scope_rejected(self):
        payload = {'account_id': str(self.account.id), 'month': f'{self.month}-01', 'amount': '500.00'}
        self.assertEqual(self.client.post(reverse('budgets'), payload, format='json').status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.client.post(reverse('budgets'), payload, format='json').status_code, status.HTTP_400_BAD_REQUEST)

    def test_rec_01_02_03_monthly_dates_handle_short_month_and_leap_year(self):
        self.assertEqual(advance_recurring_date(date(2024, 1, 31), 'MONTHLY'), date(2024, 2, 29))
        self.assertEqual(advance_recurring_date(date(2023, 1, 31), 'MONTHLY'), date(2023, 2, 28))
        self.assertEqual(advance_recurring_date(date(2024, 2, 29), 'YEARLY'), date(2025, 2, 28))

    def test_rec_04_05_disable_resume_does_not_deduct_until_recorded(self):
        payload = {'account_id': str(self.account.id), 'name': 'Rent', 'amount': '200.00', 'balance_type': 'CASH',
                   'frequency': 'MONTHLY', 'start_date': self.month + '-01', 'next_due_date': self.month + '-01', 'note': 'Monthly rent'}
        created = self.client.post(reverse('recurring_expenses'), payload, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        template_id = created.json()['id']
        before = FinancialAccount.objects.get(pk=self.account.id).cash_balance
        self.client.patch(reverse('recurring_expense_detail', kwargs={'pk': template_id}), {'enabled': False}, format='json')
        self.assertEqual(FinancialAccount.objects.get(pk=self.account.id).cash_balance, before)
        self.client.patch(reverse('recurring_expense_detail', kwargs={'pk': template_id}), {'enabled': True}, format='json')
        self.assertEqual(FinancialAccount.objects.get(pk=self.account.id).cash_balance, before)

    def test_rec_06_07_record_and_duplicate_occurrence_rejected(self):
        payload = {'account_id': str(self.account.id), 'name': 'Internet', 'amount': '75.00', 'balance_type': 'CASH',
                   'frequency': 'MONTHLY', 'start_date': self.month + '-01', 'next_due_date': self.month + '-01', 'note': 'Internet bill'}
        created = self.client.post(reverse('recurring_expenses'), payload, format='json')
        template_id = created.json()['id']
        url = reverse('recurring_expense_record', kwargs={'pk': template_id})
        first = self.client.post(url, {'scheduled_date': self.month + '-01'}, format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        duplicate = self.client.post(url, {'scheduled_date': self.month + '-01'}, format='json')
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Transaction.objects.filter(transaction_type='EXPENSE').count(), 1)

    def test_rec_08_insufficient_funds_rolls_back(self):
        payload = {'account_id': str(self.account.id), 'name': 'Large bill', 'amount': '5000.00', 'balance_type': 'CASH',
                   'frequency': 'MONTHLY', 'start_date': self.month + '-01', 'next_due_date': self.month + '-01', 'note': 'Large bill'}
        created = self.client.post(reverse('recurring_expenses'), payload, format='json')
        response = self.client.post(reverse('recurring_expense_record', kwargs={'pk': created.json()['id']}), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(FinancialAccount.objects.get(pk=self.account.id).cash_balance, Decimal('1000.00'))
        self.assertEqual(Transaction.objects.filter(transaction_type='EXPENSE').count(), 0)

    def test_rec_09_cancel_preserves_recorded_transaction_and_rec_10_isolation(self):
        payload = {'account_id': str(self.account.id), 'name': 'Phone', 'amount': '50.00', 'balance_type': 'CASH',
                   'frequency': 'MONTHLY', 'start_date': self.month + '-01', 'next_due_date': self.month + '-01', 'note': 'Phone bill'}
        created = self.client.post(reverse('recurring_expenses'), payload, format='json')
        template_id = created.json()['id']
        self.client.post(reverse('recurring_expense_record', kwargs={'pk': template_id}), format='json')
        self.client.delete(reverse('recurring_expense_detail', kwargs={'pk': template_id}))
        self.assertEqual(Transaction.objects.filter(transaction_type='EXPENSE').count(), 1)
        self.client.force_login(self.other_user)
        self.assertEqual(self.client.get(reverse('recurring_expenses'), {'account_id': str(self.account.id)}).status_code, status.HTTP_200_OK)
        self.assertEqual(len(self.client.get(reverse('recurring_expenses'), {'account_id': str(self.account.id)}).json()['results']), 0)


class Prompt08NotificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='notify@example.com', password='SecurePassword@123', full_name='Notify User')
        self.other_user = User.objects.create_user(email='notify-other@example.com', password='SecurePassword@123', full_name='Other')
        self.account = FinancialAccount.objects.create(user=self.user, name='Personal', is_default=True,
                                                       cash_balance=Decimal('1000.00'), bank_balance=Decimal('0.00'))
        self.today = user_local_date(self.user)
        self.client.force_login(self.user)

    def get_notifications(self):
        return self.client.get(reverse('notifications')).json()

    def test_not_01_daily_popup_and_not_02_dismissal_persist(self):
        first = self.get_notifications()
        self.assertTrue(first['daily_popup'])
        self.assertEqual(Notification.objects.filter(user=self.user, kind=Notification.Kind.DAILY_EXPENSE).count(), 1)
        response = self.client.post(reverse('daily_notification_response'), {'response': 'no_change'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        second = self.get_notifications()
        self.assertFalse(second['daily_popup'])
        self.assertEqual(Notification.objects.filter(user=self.user, kind=Notification.Kind.DAILY_EXPENSE).count(), 1)

    def test_not_03_daily_state_is_eligible_on_next_calendar_day(self):
        self.get_notifications()
        daily = Notification.objects.get(user=self.user, kind=Notification.Kind.DAILY_EXPENSE)
        daily.dismissed_on = self.today - timedelta(days=1)
        daily.is_read = False
        daily.save()
        self.assertTrue(self.get_notifications()['daily_popup'])

    def test_not_04_daily_state_is_shared_across_devices_and_not_14_duplicate_safe(self):
        self.get_notifications()
        self.client.logout()
        self.client.force_login(self.user)
        self.get_notifications()
        self.assertEqual(Notification.objects.filter(user=self.user, identity_key=f'daily-expense:{self.today}').count(), 1)

    def test_not_05_06_07_08_credit_due_window_status_and_exclusions(self):
        upcoming = CreditRecord.objects.create(
            user=self.user, account=self.account, creditor_name='Upcoming', original_amount=Decimal('500.00'),
            outstanding_amount=Decimal('500.00'), pay_by_date=self.today + timedelta(days=2)
        )
        CreditRecord.objects.create(
            user=self.user, account=self.account, creditor_name='Paid', original_amount=Decimal('100.00'),
            outstanding_amount=Decimal('0.00'), status='FULLY_PAID', pay_by_date=self.today
        )
        CreditRecord.objects.create(
            user=self.user, account=self.account, creditor_name='No date', original_amount=Decimal('100.00'),
            outstanding_amount=Decimal('100.00')
        )
        overdue = CreditRecord.objects.create(
            user=self.user, account=self.account, creditor_name='Overdue', original_amount=Decimal('700.00'),
            outstanding_amount=Decimal('700.00'), pay_by_date=self.today - timedelta(days=1)
        )
        results = self.get_notifications()['results']
        credit_results = [item for item in results if item['kind'] == 'CREDIT_PAYMENT']
        self.assertEqual({item['related_id'] for item in credit_results}, {str(upcoming.id), str(overdue.id)})
        self.assertEqual(next(item['status'] for item in credit_results if item['related_id'] == str(overdue.id)), 'OVERDUE')

    def test_not_09_10_11_recurring_due_disabled_and_recorded_exclusions(self):
        template = RecurringExpenseTemplate.objects.create(
            user=self.user, account=self.account, name='Internet', amount=Decimal('75.00'),
            balance_type='CASH', frequency='MONTHLY', start_date=self.today,
            next_due_date=self.today, note='Internet bill'
        )
        disabled = RecurringExpenseTemplate.objects.create(
            user=self.user, account=self.account, name='Disabled', amount=Decimal('50.00'),
            balance_type='CASH', frequency='MONTHLY', start_date=self.today,
            next_due_date=self.today, note='Disabled bill', enabled=False
        )
        first = [item for item in self.get_notifications()['results'] if item['kind'] == 'RECURRING_EXPENSE']
        self.assertEqual([item['related_id'] for item in first], [str(template.id)])
        self.client.post(reverse('recurring_expense_record', kwargs={'pk': template.id}), format='json')
        second = [item for item in self.get_notifications()['results'] if item['kind'] == 'RECURRING_EXPENSE']
        self.assertEqual(second, [])
        self.assertNotIn(str(disabled.id), [item['related_id'] for item in second])

    def test_not_12_unread_count_updates_after_read_and_dismiss(self):
        data = self.get_notifications()
        self.assertEqual(data['unread_count'], 1)
        daily_id = next(item['id'] for item in data['results'] if item['kind'] == 'DAILY_EXPENSE')
        self.client.post(reverse('notification_read', kwargs={'pk': daily_id}), format='json')
        self.assertEqual(self.client.get(reverse('notification_unread_count')).json()['unread_count'], 0)

    def test_not_13_user_cannot_access_another_users_notification(self):
        notification = Notification.objects.create(
            user=self.other_user, kind=Notification.Kind.DAILY_EXPENSE,
            identity_key='private', title='Private', message='Private'
        )
        response = self.client.post(reverse('notification_read', kwargs={'pk': notification.id}), format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class Prompt09ReportTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='report@example.com', password='SecurePassword@123', full_name='Report User')
        self.other_user = User.objects.create_user(email='report-other@example.com', password='SecurePassword@123', full_name='Other')
        self.account = FinancialAccount.objects.create(
            user=self.user, name='Personal', is_default=True,
            cash_balance=Decimal('5000.00'), bank_balance=Decimal('3000.00')
        )
        self.other_account = FinancialAccount.objects.create(
            user=self.other_user, name='Private', is_default=True,
            cash_balance=Decimal('9000.00'), bank_balance=Decimal('9000.00')
        )
        self.category = Category.objects.create(name='Report Food', icon='Utensils', color='#f97316')
        self.today = user_local_date(self.user)
        self.client.force_login(self.user)

    def create_txn(self, kind, amount, date=None, category=None, note='Report transaction'):
        return Transaction.objects.create(
            account=self.account,
            transaction_type=kind,
            amount=Decimal(amount),
            balance_type=Transaction.BalanceType.CASH,
            category=category,
            note=note,
            date=date or self.today,
        )

    def test_rpt_01_02_03_period_totals(self):
        self.create_txn(Transaction.TransactionType.ADD_CASH, '1000.00')
        self.create_txn(Transaction.TransactionType.EXPENSE, '250.00', category=self.category)
        response = self.client.get(reverse('report_summary'), {
            'account_id': str(self.account.id), 'period': 'daily'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data['income'])), Decimal('1000.00'))
        self.assertEqual(Decimal(str(response.data['expenses'])), Decimal('250.00'))
        for period in ('monthly', 'yearly'):
            response = self.client.get(reverse('report_summary'), {
                'account_id': str(self.account.id), 'period': period
            })
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rpt_04_category_spending(self):
        self.create_txn(Transaction.TransactionType.EXPENSE, '175.50', category=self.category)
        response = self.client.get(reverse('report_categories'), {'account_id': str(self.account.id), 'period': 'monthly'})
        row = next(item for item in response.data['categories'] if item['name'] == 'Report Food')
        self.assertEqual(Decimal(str(row['amount'])), Decimal('175.50'))

    def test_rpt_05_excludes_transfers(self):
        self.create_txn(Transaction.TransactionType.TRANSFER, '400.00', note='Cash to bank')
        response = self.client.get(reverse('report_summary'), {'account_id': str(self.account.id), 'period': 'monthly'})
        self.assertEqual(Decimal(str(response.data['income'])), Decimal('0.00'))
        self.assertEqual(Decimal(str(response.data['expenses'])), Decimal('0.00'))

    def test_rpt_06_excludes_lending_credit_movements(self):
        for kind in (
            Transaction.TransactionType.LENDING,
            Transaction.TransactionType.LENDING_REPAYMENT,
            Transaction.TransactionType.CREDIT,
            Transaction.TransactionType.CREDIT_REPAYMENT,
        ):
            self.create_txn(kind, '300.00')
        response = self.client.get(reverse('report_summary'), {'account_id': str(self.account.id), 'period': 'monthly'})
        self.assertEqual(Decimal(str(response.data['income'])), Decimal('0.00'))
        self.assertEqual(Decimal(str(response.data['expenses'])), Decimal('0.00'))

    def test_rpt_07_excludes_savings_and_investment_purchases(self):
        for kind in (
            Transaction.TransactionType.SAVINGS_ALLOCATION,
            Transaction.TransactionType.SAVINGS_WITHDRAWAL,
            Transaction.TransactionType.INVESTMENT_PURCHASE,
        ):
            self.create_txn(kind, '500.00')
        response = self.client.get(reverse('report_summary'), {'account_id': str(self.account.id), 'period': 'monthly'})
        self.assertEqual(Decimal(str(response.data['expenses'])), Decimal('0.00'))

    def test_rpt_08_voided_transaction_is_excluded(self):
        txn = self.create_txn(Transaction.TransactionType.EXPENSE, '999.00', category=self.category)
        txn.is_voided = True
        txn.save(update_fields=['is_voided'])
        response = self.client.get(reverse('report_summary'), {'account_id': str(self.account.id), 'period': 'monthly'})
        self.assertEqual(Decimal(str(response.data['expenses'])), Decimal('0.00'))

    def test_rpt_09_account_and_date_filters(self):
        self.create_txn(Transaction.TransactionType.ADD_CASH, '111.00', date=self.today)
        response = self.client.get(reverse('report_summary'), {
            'account_id': str(self.account.id),
            'date_from': self.today.isoformat(),
            'date_to': self.today.isoformat(),
        })
        self.assertEqual(Decimal(str(response.data['income'])), Decimal('111.00'))

    def test_rpt_10_cross_user_isolation(self):
        other_txn = Transaction.objects.create(
            account=self.other_account,
            transaction_type=Transaction.TransactionType.ADD_CASH,
            amount=Decimal('7777.00'),
            balance_type=Transaction.BalanceType.CASH,
            note='Private transaction',
            date=self.today,
        )
        response = self.client.get(reverse('report_summary'), {'account_id': str(self.other_account.id)})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Transaction.objects.filter(pk=other_txn.pk).exists())

    def test_rpt_11_csv_matches_filtered_records(self):
        self.create_txn(Transaction.TransactionType.EXPENSE, '125.25', category=self.category, note='Filtered lunch')
        response = self.client.get(reverse('report_csv_export'), {
            'account_id': str(self.account.id),
            'period': 'monthly',
            'expense_only': 'true',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = response.content.decode('utf-8-sig')
        self.assertIn('Filtered lunch', content)
        self.assertIn('125.25', content)

    def test_rpt_12_csv_formula_injection_is_neutralized(self):
        self.create_txn(Transaction.TransactionType.EXPENSE, '10.00', category=self.category, note='=SUM(1,2)')
        response = self.client.get(reverse('report_csv_export'), {'account_id': str(self.account.id), 'period': 'monthly'})
        content = response.content.decode('utf-8-sig')
        self.assertIn("'=SUM(1,2)", content)

    def test_rpt_13_pdf_is_valid_and_authoritative(self):
        self.create_txn(Transaction.TransactionType.ADD_CASH, '999.00')
        response = self.client.get(reverse('report_pdf_export'), {'account_id': str(self.account.id), 'period': 'monthly'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_rpt_14_empty_report_period(self):
        old_date = self.today.replace(year=max(2000, self.today.year - 5))
        response = self.client.get(reverse('report_summary'), {
            'account_id': str(self.account.id),
            'date_from': old_date.isoformat(),
            'date_to': old_date.isoformat(),
        })
        self.assertEqual(Decimal(str(response.data['income'])), Decimal('0.00'))
        self.assertEqual(Decimal(str(response.data['expenses'])), Decimal('0.00'))
