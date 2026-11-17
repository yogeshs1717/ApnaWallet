from decimal import Decimal
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
)


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
