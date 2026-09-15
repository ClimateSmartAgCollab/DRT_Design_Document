from datetime import datetime
from unittest.mock import patch

from django.conf import settings
from django.db.models.signals import post_save
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone

from drt.models import NLink, Negotiation
from drt.views.stats import _validate_summary_stats, generate_summary_statistics


OWNER_EMAIL = "owner@example.com"
OWNER_ID = "owner-test-1"
OWNER_TABLE = {OWNER_ID: {"owner_email": OWNER_EMAIL, "username": "owner"}}


class ValidateSummaryStatsTests(SimpleTestCase):
    def test_identity_includes_canceled(self):
        self.assertTrue(
            _validate_summary_stats(
                {
                    "total_requests": 7,
                    "accepted_requests": 1,
                    "rejected_requests": 1,
                    "requestor_open": 1,
                    "owner_open": 1,
                    "abandoned_requests": 1,
                    "archived_requests": 1,
                    "canceled_requests": 1,
                }
            )["is_valid"]
        )

    def test_missing_canceled_fails_when_total_includes_it(self):
        result = _validate_summary_stats(
            {
                "total_requests": 2,
                "accepted_requests": 1,
                "rejected_requests": 0,
                "requestor_open": 0,
                "owner_open": 0,
                "abandoned_requests": 0,
                "archived_requests": 0,
                "canceled_requests": 0,
            }
        )
        self.assertFalse(result["is_valid"])
        self.assertEqual(result["difference"], 1)


class SummaryStatisticsViewTests(TestCase):
    def setUp(self):
        post_save.disconnect(generate_summary_statistics, sender=Negotiation)
        self.cache_patcher = patch(
            "drt.views.stats.cache.get",
            side_effect=lambda key, default=None: OWNER_TABLE if key == "owner_table" else default,
        )
        self.cache_patcher.start()
        self._set_session(owner_email=OWNER_EMAIL)
        self.url = reverse("summary_statistics")

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
        dataset_id,
        visible_label,
        tags,
        state="accepted",
        created_at=None,
    ):
        negotiation = Negotiation.objects.create(
            questionnaire_SAID="test-said",
            state="requestor_open",
        )
        if state != "requestor_open":
            Negotiation.objects.filter(pk=negotiation.pk).update(state=state)
        if created_at is not None:
            Negotiation.objects.filter(pk=negotiation.pk).update(timestamps=created_at)
        negotiation.refresh_from_db()
        return NLink.objects.create(
            negotiation=negotiation,
            owner_id=OWNER_ID,
            dataset_ID=dataset_id,
            data_label=data_label,
            record_label=record_label,
            visible_label=visible_label,
            tags=tags,
        )

    def _get(self, **params):
        return self.client.get(self.url, data=params)

    def test_unauthenticated_returns_401(self):
        self.client.cookies.clear()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_shared_tag_returns_two_grouped_rows(self):
        self._make_case(
            data_label="basic_data_request",
            record_label="basic_a",
            dataset_id="ds-a",
            visible_label="Basic A",
            tags=["2026", "basic_data_request"],
        )
        self._make_case(
            data_label="detailed_data_request",
            record_label="detailed_b",
            dataset_id="ds-b",
            visible_label="Detailed B",
            tags=["2026", "detailed_data_request"],
        )

        response = self._get(group_by="true", tags=["2026"])
        self.assertEqual(response.status_code, 200)
        rows = response.json()["summary_statistics"]
        self.assertEqual(len(rows), 2)
        labels = {(row["data_label"], row["record_label"]) for row in rows}
        self.assertEqual(
            labels,
            {
                ("basic_data_request", "basic_a"),
                ("detailed_data_request", "detailed_b"),
            },
        )

    def test_data_label_getlist_restricts_to_selected_labels(self):
        self._make_case(
            data_label="alpha",
            record_label="r1",
            dataset_id="ds-1",
            visible_label="Alpha",
            tags=["2026"],
        )
        self._make_case(
            data_label="beta",
            record_label="r2",
            dataset_id="ds-2",
            visible_label="Beta",
            tags=["2026"],
        )
        self._make_case(
            data_label="gamma",
            record_label="r3",
            dataset_id="ds-3",
            visible_label="Gamma",
            tags=["2026"],
        )

        response = self._get(group_by="true", data_label=["alpha", "beta"])
        self.assertEqual(response.status_code, 200)
        rows = response.json()["summary_statistics"]
        self.assertEqual({row["data_label"] for row in rows}, {"alpha", "beta"})

    def test_canceled_is_counted_and_validation_passes(self):
        self._make_case(
            data_label="basic_data_request",
            record_label="basic_a",
            dataset_id="ds-a",
            visible_label="Basic A",
            tags=["2026"],
            state="canceled",
        )

        response = self._get(group_by="true")
        self.assertEqual(response.status_code, 200)
        rows = response.json()["summary_statistics"]
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["canceled_requests"], 1)
        self.assertEqual(row["total_requests"], 1)
        self.assertTrue(row["validation_status"]["is_valid"])

    def test_payload_includes_identity_fields(self):
        self._make_case(
            data_label="basic_data_request",
            record_label="basic_a",
            dataset_id="ds-a",
            visible_label="Basic A",
            tags=["2026"],
        )

        response = self._get(group_by="true")
        self.assertEqual(response.status_code, 200)
        row = response.json()["summary_statistics"][0]
        self.assertEqual(row["dataset_ID"], "ds-a")
        self.assertEqual(row["visible_label"], "Basic A")
        self.assertIn("canceled_requests", row)
        self.assertIn("is_valid", row["validation_status"])

    def test_date_filter_uses_request_created_timestamps(self):
        old = timezone.make_aware(datetime(2020, 6, 1, 12, 0, 0))
        recent = timezone.make_aware(datetime(2025, 6, 1, 12, 0, 0))
        self._make_case(
            data_label="old_label",
            record_label="old_record",
            dataset_id="ds-old",
            visible_label="Old",
            tags=["2026"],
            created_at=old,
        )
        self._make_case(
            data_label="new_label",
            record_label="new_record",
            dataset_id="ds-new",
            visible_label="New",
            tags=["2026"],
            created_at=recent,
        )

        response = self._get(group_by="true", startDate="2024-01-01")
        self.assertEqual(response.status_code, 200)
        rows = response.json()["summary_statistics"]
        self.assertEqual([row["data_label"] for row in rows], ["new_label"])

    def test_unfiltered_request_live_aggregates_without_snapshot(self):
        self._make_case(
            data_label="basic_data_request",
            record_label="basic_a",
            dataset_id="ds-a",
            visible_label="Basic A",
            tags=["2026"],
            state="accepted",
        )
        self._make_case(
            data_label="basic_data_request",
            record_label="basic_a",
            dataset_id="ds-a",
            visible_label="Basic A",
            tags=["2026"],
            state="rejected",
        )

        response = self._get()
        self.assertEqual(response.status_code, 200)
        rows = response.json()["summary_statistics"]
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["data_label"], "basic_data_request")
        self.assertEqual(row["record_label"], "basic_a")
        self.assertEqual(row["total_requests"], 2)
        self.assertEqual(row["accepted_requests"], 1)
        self.assertEqual(row["rejected_requests"], 1)
        self.assertTrue(row["validation_status"]["is_valid"])


class TerminalNegotiationArchiveTests(TestCase):
    def setUp(self):
        self.cache_patcher = patch(
            "drt.views.stats.cache.get",
            side_effect=lambda key, default=None: OWNER_TABLE if key == "owner_table" else default,
        )
        self.cache_patcher.start()
        session = self.client.session
        session["owner_email"] = OWNER_EMAIL
        session.save()
        self.client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key

    def tearDown(self):
        self.cache_patcher.stop()

    def _make_open_case(self):
        negotiation = Negotiation.objects.create(
            questionnaire_SAID="test-said",
            state="requestor_open",
        )
        NLink.objects.create(
            negotiation=negotiation,
            owner_id=OWNER_ID,
            dataset_ID="ds-a",
            data_label="basic_data_request",
            record_label="basic_a",
            visible_label="Basic A",
            tags=["2026"],
        )
        return negotiation

    def _save_terminal_state(self, state):
        negotiation = self._make_open_case()
        negotiation.state = state
        negotiation.save()
        negotiation.refresh_from_db()
        self.assertTrue(negotiation.archived)

    def test_accept_archives_without_export(self):
        self._save_terminal_state("accepted")

    def test_reject_archives_without_export(self):
        self._save_terminal_state("rejected")

    def test_reopen_does_not_export(self):
        negotiation = self._make_open_case()
        Negotiation.objects.filter(pk=negotiation.pk).update(
            state="accepted",
            archived=True,
        )

        with patch("drt.views.stats.send_reopen_notification_email_task"):
            response = self.client.get(
                reverse(
                    "reopen_negotiation",
                    kwargs={"negotiation_id": negotiation.negotiation_id},
                )
            )

        self.assertEqual(response.status_code, 200)
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.state, "owner_open")
        self.assertFalse(negotiation.archived)
