from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class HealthCheckTests(APITestCase):
    """
    STQA Automated Unit Test Suite for Core Health Check API
    """

    def test_health_check_endpoint_returns_200_and_valid_json(self):
        """
        Verify that GET /api/health/ returns HTTP 200 with expected application payload.
        """
        url = reverse('health_check')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {
            "status": "ok",
            "application": "ApnaWallet"
        })
