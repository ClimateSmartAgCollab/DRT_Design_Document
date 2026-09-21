from datetime import datetime
from unittest.mock import patch

from django.conf import settings
from django.db import connection
from django.db.models.signals import post_save
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from drt.models import NLink, Negotiation
from drt.views.stats import generate_summary_statistics


OWNER_EMAIL = "owner@example.com"
OWNER_ID = "owner-test-1"
OWNER_TABLE = {OWNER_ID: {"owner_email": OWNER_EMAIL, "username": "owner"}}


class NegotiationListApiFilterTests(TestCase):
    def setUp(self):
        post_save.disconnect(generate_summary_statistics, sender=Negotiation)
        self.cache_patcher = patch(
            "drt.views.stats.cache.get",
            side_effect=lambda key, default=None: OWNER_TABLE if key == "owner_table" else default,
        )
        self.cache_patcher.start()
        self._set_session(owner_email=OWNER_EMAIL)
        self.url = reverse("negotiation_list_api")

    def tearDown(self):
        self.cache_patcher.stop()
        post_save.connect(generate_summary_statistics, sender=Negotiation)

    def _set_session(self, **kwargs):
        session = self.client.session
        for key, value in kwargs.items():
            session[key] = value
        session.save()
        self.client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key

    def _make_case(
        self,
        *,
        data_label,
        record_label,
        tags,
        state="accepted",
        created_at=None,
        decided_at=None,
        dataset_id="ds-1",
        visible_label="Visible",
        fulfillment_status=None,
    ):
        negotiation = Negotiation.objects.create(
            questionnaire_SAID="test-said",
            state="requestor_open",
        )
        updates = {}
        if state != "requestor_open":
            updates["state"] = state
        if created_at is not None:
            updates["timestamps"] = created_at
        if decided_at is not None:
            updates["decided_at"] = decided_at
        if fulfillment_status is not None:
            updates["fulfillment_status"] = fulfillment_status
        if updates:
            Negotiation.objects.filter(pk=negotiation.pk).update(**updates)
        negotiation.refresh_from_db()
        NLink.objects.create(
            negotiation=negotiation,
            owner_id=OWNER_ID,
            dataset_ID=dataset_id,
            data_label=data_label,
            record_label=record_label,
            visible_label=visible_label,
            tags=tags,
        )
        return negotiation

    def _ids(self, response):
        return {row["negotiation_id"] for row in response.json()["results"]}

    def test_unauthenticated_returns_401(self):
        self.client.cookies.clear()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_get_sets_never_cache_headers(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("no-cache", response.get("Cache-Control", ""))

    def test_tags_are_anded(self):
        both = self._make_case(
            data_label="basic_data_request",
            record_label="basic_a",
            tags=["2026", "basic_data_request"],
        )
        self._make_case(
            data_label="detailed_data_request",
            record_label="detailed_b",
            tags=["2026"],
        )

        response = self.client.get(
            self.url, {"tags": ["2026", "basic_data_request"]}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._ids(response), {str(both.negotiation_id)})

    def test_tag_match_any_is_overlap(self):
        if connection.vendor != "postgresql":
            self.skipTest("ArrayField overlap requires Postgres")

        both = self._make_case(
            data_label="basic_data_request",
            record_label="basic_a",
            tags=["2026", "basic_data_request"],
        )
        year_only = self._make_case(
            data_label="detailed_data_request",
            record_label="detailed_b",
            tags=["2026"],
        )

        response = self.client.get(
            self.url,
            {"tags": ["2026", "basic_data_request"], "tag_match": "any"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self._ids(response),
            {str(both.negotiation_id), str(year_only.negotiation_id)},
        )

    def test_data_label_getlist_restricts_results(self):
        alpha = self._make_case(
            data_label="alpha",
            record_label="r1",
            tags=["2026"],
        )
        beta = self._make_case(
            data_label="beta",
            record_label="r2",
            tags=["2026"],
        )
        self._make_case(
            data_label="gamma",
            record_label="r3",
            tags=["2026"],
        )

        response = self.client.get(self.url, {"data_label": ["alpha", "beta"]})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self._ids(response),
            {str(alpha.negotiation_id), str(beta.negotiation_id)},
        )

    def test_combined_deep_link_filters(self):
        recent = timezone.make_aware(datetime(2025, 6, 1, 12, 0, 0))
        old = timezone.make_aware(datetime(2020, 6, 1, 12, 0, 0))

        match = self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026", "basic_data_request"],
            state="owner_open",
            created_at=recent,
        )
        self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026", "basic_data_request"],
            state="accepted",
            created_at=recent,
        )
        self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026"],
            state="owner_open",
            created_at=recent,
        )
        self._make_case(
            data_label="beta",
            record_label="door-a",
            tags=["2026", "basic_data_request"],
            state="owner_open",
            created_at=recent,
        )
        self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026", "basic_data_request"],
            state="owner_open",
            created_at=old,
        )

        response = self.client.get(
            self.url,
            {
                "status": ["owner_open"],
                "tags": ["2026", "basic_data_request"],
                "record_label": ["door-a"],
                "data_label": ["alpha"],
                "startDate": "2024-01-01",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._ids(response), {str(match.negotiation_id)})
        self.assertEqual(response.json()["results"][0]["data_label"], "alpha")

    def test_date_field_decided_filters_on_decided_at(self):
        created = timezone.make_aware(datetime(2025, 6, 1, 12, 0, 0))
        inside = self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026"],
            state="accepted",
            created_at=created,
            decided_at=timezone.make_aware(datetime(2025, 6, 15, 12, 0, 0)),
        )
        self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026"],
            state="accepted",
            created_at=created,
            decided_at=timezone.make_aware(datetime(2024, 1, 15, 12, 0, 0)),
        )
        self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026"],
            state="owner_open",
            created_at=created,
        )

        response = self.client.get(
            self.url,
            {
                "dateField": "decided",
                "startDate": "2025-06-01",
                "endDate": "2025-06-30",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._ids(response), {str(inside.negotiation_id)})

    def test_date_window_end_date_includes_same_day_afternoon(self):
        afternoon = timezone.make_aware(datetime(2025, 6, 30, 15, 0, 0))
        match = self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026"],
            state="accepted",
            created_at=afternoon,
            decided_at=afternoon,
        )
        response = self.client.get(
            self.url,
            {
                "dateField": "decided",
                "startDate": "2025-06-30",
                "endDate": "2025-06-30",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._ids(response), {str(match.negotiation_id)})

    def test_payload_includes_fulfillment_fields(self):
        negotiation = self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026"],
            fulfillment_status="pending",
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        row = response.json()["results"][0]
        self.assertEqual(row["negotiation_id"], str(negotiation.negotiation_id))
        self.assertEqual(row["fulfillment_status"], "pending")
        self.assertIn("fulfillment_note", row)
        self.assertIn("fulfillment_at", row)

    def test_search_matches_exact_tag(self):
        tagged = self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026"],
            visible_label="Visible",
        )
        self._make_case(
            data_label="beta",
            record_label="door-b",
            tags=["basic_data_request"],
            visible_label="Other",
        )

        response = self.client.get(self.url, {"search": "2026"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._ids(response), {str(tagged.negotiation_id)})

    def test_fulfillment_status_filter(self):
        pending = self._make_case(
            data_label="alpha",
            record_label="door-a",
            tags=["2026"],
            fulfillment_status="pending",
        )
        self._make_case(
            data_label="alpha",
            record_label="door-b",
            tags=["2026"],
            fulfillment_status="delivered",
        )
        response = self.client.get(
            self.url, {"fulfillment_status": "pending"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._ids(response), {str(pending.negotiation_id)})
