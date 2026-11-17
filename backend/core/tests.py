from decimal import Decimal
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase
from .models import FinancialAccount, User


class ApnaWalletAuthSTQATests(APITestCase):
    """
    Formal STQA Automated Test Suite for ApnaWallet
    Covers: AUTH-01 through AUTH-14, Multi-tenant Isolation, and Password Recovery
    """

    def setUp(self):
        cache.clear()
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.profile_url = reverse('user_profile')
        self.accounts_url = reverse('financial_accounts')
        self.pwd_reset_req_url = reverse('password_reset_request')
        self.pwd_reset_confirm_url = reverse('password_reset_confirm')

        # Baseline seed user
        self.user1_data = {
            'full_name': 'Aarav Sharma',
            'email': 'aarav@example.com',
            'password': 'SecurePassword@123'
        }
        self.user1 = User.objects.create_user(
            email=self.user1_data['email'],
            password=self.user1_data['password'],
            full_name=self.user1_data['full_name']
        )
        self.user1_account = FinancialAccount.objects.create(
            user=self.user1,
            name='Personal',
            is_default=True,
            cash_balance=Decimal('1500.00'),
            bank_balance=Decimal('25000.00')
        )

        # Second user for cross-account isolation testing
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
            bank_balance=Decimal('80000.00')
        )

    # ---------------------------------------------------------
    # AUTH-01: Valid Registration
    # ---------------------------------------------------------
    def test_auth_01_valid_registration(self):
        payload = {
            'full_name': 'Rohan Verma',
            'email': 'rohan@example.com',
            'password': 'ValidComplexPassword99!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['email'], 'rohan@example.com')
        self.assertEqual(response.data['user']['full_name'], 'Rohan Verma')
        # Session established
        self.assertIn('_auth_user_id', self.client.session)

    # ---------------------------------------------------------
    # AUTH-02: Duplicate Email Rejection
    # ---------------------------------------------------------
    def test_auth_02_duplicate_email_rejection(self):
        payload = {
            'full_name': 'Aarav Impostor',
            'email': 'aarav@example.com',  # Existing
            'password': 'AnotherPassword123!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    # ---------------------------------------------------------
    # AUTH-03: Weak Password Rejection
    # ---------------------------------------------------------
    def test_auth_03_weak_password_rejection(self):
        payload = {
            'full_name': 'Weak User',
            'email': 'weak@example.com',
            'password': '123'  # Too short / common
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    # ---------------------------------------------------------
    # AUTH-04: Correct Login
    # ---------------------------------------------------------
    def test_auth_04_correct_login(self):
        payload = {
            'email': self.user1_data['email'],
            'password': self.user1_data['password']
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], self.user1_data['email'])

    # ---------------------------------------------------------
    # AUTH-05: Incorrect Password Rejection
    # ---------------------------------------------------------
    def test_auth_05_incorrect_password(self):
        payload = {
            'email': self.user1_data['email'],
            'password': 'WrongPassword123'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ---------------------------------------------------------
    # AUTH-06: Logout
    # ---------------------------------------------------------
    def test_auth_06_logout(self):
        self.client.force_login(self.user1)
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify subsequent protected call returns 403 / 401
        profile_response = self.client.get(self.profile_url)
        self.assertEqual(profile_response.status_code, status.HTTP_403_FORBIDDEN)

    # ---------------------------------------------------------
    # AUTH-07: Protected API Without Authentication
    # ---------------------------------------------------------
    def test_auth_07_protected_api_without_auth(self):
        response = self.client.get(self.accounts_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ---------------------------------------------------------
    # AUTH-08: Personal Account Created Automatically
    # ---------------------------------------------------------
    def test_auth_08_personal_account_created_automatically(self):
        payload = {
            'full_name': 'Kavita Rao',
            'email': 'kavita@example.com',
            'password': 'ValidComplexPassword99!'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='kavita@example.com')
        personal_acc = FinancialAccount.objects.filter(user=new_user, is_default=True).first()
        self.assertIsNotNone(personal_acc)
        self.assertEqual(personal_acc.name, 'Personal')
        self.assertEqual(personal_acc.currency, 'INR')
        self.assertEqual(personal_acc.cash_balance, Decimal('0.00'))
        self.assertEqual(personal_acc.bank_balance, Decimal('0.00'))

    # ---------------------------------------------------------
    # AUTH-09: User Cannot Access Another User's Account (Multi-tenant)
    # ---------------------------------------------------------
    def test_auth_09_multi_tenant_isolation(self):
        # Login as user 1
        self.client.force_login(self.user1)
        response = self.client.get(self.accounts_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        account_ids = [acc['id'] for acc in response.data]
        self.assertIn(str(self.user1_account.id), account_ids)
        self.assertNotIn(str(self.user2_account.id), account_ids)

    # ---------------------------------------------------------
    # AUTH-10: Password Reset Request Dispatches Email
    # ---------------------------------------------------------
    def test_auth_10_password_reset_request(self):
        mail.outbox.clear()
        payload = {'email': self.user1.email}
        response = self.client.post(self.pwd_reset_req_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Password Reset Request", mail.outbox[0].subject)
        self.assertIn(self.user1.email, mail.outbox[0].to)

    # ---------------------------------------------------------
    # AUTH-11: Valid Reset Link Sets New Password
    # ---------------------------------------------------------
    def test_auth_11_valid_reset_link_success(self):
        uid = urlsafe_base64_encode(force_bytes(self.user1.pk))
        token = default_token_generator.make_token(self.user1)
        new_pass = 'NewlySetPassword#999'

        payload = {
            'uid': uid,
            'token': token,
            'new_password': new_pass
        }
        response = self.client.post(self.pwd_reset_confirm_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify login works with new password
        login_res = self.client.post(self.login_url, {
            'email': self.user1.email,
            'password': new_pass
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

    # ---------------------------------------------------------
    # AUTH-12: Invalid or Expired Reset Link Rejected
    # ---------------------------------------------------------
    def test_auth_12_invalid_reset_link_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user1.pk))
        payload = {
            'uid': uid,
            'token': 'completely-bogus-token-12345',
            'new_password': 'NewlySetPassword#999'
        }
        response = self.client.post(self.pwd_reset_confirm_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ---------------------------------------------------------
    # AUTH-13: Reused Reset Link Rejected (Single-Use Guarantee)
    # ---------------------------------------------------------
    def test_auth_13_reused_reset_link_rejected(self):
        uid = urlsafe_base64_encode(force_bytes(self.user1.pk))
        token = default_token_generator.make_token(self.user1)

        payload = {
            'uid': uid,
            'token': token,
            'new_password': 'FirstResetPassword#111'
        }
        # First use -> Success
        res1 = self.client.post(self.pwd_reset_confirm_url, payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Attempt to reuse the exact same token -> MUST BE REJECTED
        payload['new_password'] = 'SecondResetPassword#222'
        res2 = self.client.post(self.pwd_reset_confirm_url, payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    # ---------------------------------------------------------
    # AUTH-14: Reset Request Rate Limiting (Too Many Requests - 429)
    # ---------------------------------------------------------
    def test_auth_14_password_reset_rate_limiting(self):
        cache.clear()
        payload = {'email': self.user1.email}
        # Throttled at 5/minute. The 6th request must trigger HTTP 429
        statuses = []
        for _ in range(6):
            res = self.client.post(self.pwd_reset_req_url, payload, format='json')
            statuses.append(res.status_code)
        
        self.assertIn(status.HTTP_429_TOO_MANY_REQUESTS, statuses)
