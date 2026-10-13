import base64

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from datastore.cache_keys import KEY_LINK_TABLE

LINK_ID = "75cb9450-01af-40b2-9cd5-e7fb0d82b59d"
LINK_ROW = {
    "questionnaire_id": "q-said",
    "license_id": "l-said",
    "owner_id": "owner-1",
    "data_label": "basic",
    "tags": ["2026"],
    "record_label": "basic_26",
    "visible_label": "Basic",
    "link_uuid": LINK_ID,
    "status": "active",
}


class GenerateNlinksAuthTests(TestCase):
    def setUp(self):
        cache.clear()
        cache.set(KEY_LINK_TABLE, {LINK_ID: LINK_ROW})
        self.url = reverse("generate_nlinks", args=[LINK_ID])

    def tearDown(self):
        cache.clear()

    def test_mailpit_basic_auth_header_does_not_403(self):
        raw = base64.b64encode(b"tester:mailpit-password").decode("ascii")
        response = self.client.get(self.url, HTTP_AUTHORIZATION=f"Basic {raw}")
        self.assertEqual(response.status_code, 200)
        self.assertIn("requestor_link_id", response.json())

    def test_disabled_catalog_status_still_403(self):
        cache.set(
            KEY_LINK_TABLE,
            {LINK_ID: {**LINK_ROW, "status": "disabled"}},
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "link_not_requestable")
