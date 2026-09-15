import os
from unittest.mock import patch

from django.conf import settings
from django.test import SimpleTestCase
from django.urls import NoReverseMatch, reverse


JOB_URL_NAMES = (
    "delete_old_negotiations",
    "process_abandonment_policy",
)

LISTED_ADMIN = "admin@example.com"
OTHER_ADMIN = "intruder@example.com"


class JobViewAuthTests(SimpleTestCase):
    def setUp(self):
        self.urls = [reverse(name) for name in JOB_URL_NAMES]

    def _set_session(self, **kwargs):
        """Persist session keys into the signed-cookie backend used in tests."""
        session = self.client.session
        for key, value in kwargs.items():
            session[key] = value
        session.save()
        self.client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key

    def test_unauthenticated_returns_401(self):
        for url in self.urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 401)

    def test_owner_session_returns_401(self):
        self._set_session(owner_email="owner@example.com")

        for url in self.urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 401)

    @patch.dict(os.environ, {"ADMIN_EMAILS": LISTED_ADMIN})
    def test_non_listed_admin_returns_403(self):
        self._set_session(admin_email=OTHER_ADMIN)

        for url in self.urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 403)

    def test_export_summary_route_is_gone(self):
        with self.assertRaises(NoReverseMatch):
            reverse("export_summary_to_drt_view")

    @patch.dict(os.environ, {"ADMIN_EMAILS": LISTED_ADMIN})
    def test_listed_admin_delete_old_returns_200(self):
        self._set_session(admin_email=LISTED_ADMIN)

        with patch(
            "drt.views.stats.delete_old_negotiations",
            return_value={"message": "ok", "deleted_count": 0},
        ) as mock_delete:
            response = self.client.get(reverse("delete_old_negotiations"))

        self.assertEqual(response.status_code, 200)
        mock_delete.assert_called_once_with()
        self.assertEqual(response.json()["deleted_count"], 0)

    @patch.dict(os.environ, {"ADMIN_EMAILS": LISTED_ADMIN})
    def test_listed_admin_abandonment_returns_200(self):
        self._set_session(admin_email=LISTED_ADMIN)

        payload = {
            "reminders_sent": 0,
            "negotiations_abandoned": 0,
            "total_inactive": 0,
            "total_for_abandonment": 0,
        }
        with patch(
            "drt.views.stats.process_abandonment_policy",
            return_value=payload,
        ) as mock_process:
            response = self.client.get(reverse("process_abandonment_policy"))

        self.assertEqual(response.status_code, 200)
        mock_process.assert_called_once_with()
        self.assertEqual(response.json()["reminders_sent"], 0)
