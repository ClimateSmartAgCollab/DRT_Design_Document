from datetime import datetime, timedelta
from unittest.mock import patch

from django.conf import settings
from django.db.models.signals import post_save
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone

from drt.models import NLink, Negotiation
from drt.views.stats import _validate_summary_stats, _window_bound, generate_summary_statistics


OWNER_EMAIL = "owner@example.com"
OWNER_ID = "owner-test-1"
OWNER_TABLE = {OWNER_ID: {"owner_email": OWNER_EMAIL, "username": "owner"}}


class WindowBoundTests(SimpleTestCase):
    def test_date_only_end_is_aware_end_of_day(self):
        dt = _window_bound("2025-06-30", end=True)
        self.assertIsNotNone(dt)
        self.assertTrue(timezone.is_aware(dt))
        self.assertEqual(dt.hour, 23)
        self.assertEqual(dt.minute, 59)

    def test_date_only_start_is_aware_midnight(self):
        dt = _window_bound("2025-06-30", end=False)
        self.assertIsNotNone(dt)
        self.assertTrue(timezone.is_aware(dt))
        self.assertEqual(dt.hour, 0)
        self.assertEqual(dt.minute, 0)


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
        submitted_at=None,
        first_owner_open_at=None,
        decided_at=None,
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
        if submitted_at is not None:
            updates["submitted_at"] = submitted_at
        if first_owner_open_at is not None:
            updates["first_owner_open_at"] = first_owner_open_at
        if decided_at is not None:
            updates["decided_at"] = decided_at
        if fulfillment_status is not None:
            updates["fulfillment_status"] = fulfillment_status
        if updates:
            Negotiation.objects.filter(pk=negotiation.pk).update(**updates)
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
        clocks = response.json()["clocks"]
        self.assertEqual(clocks["date_field"], "created")

    def test_decided_window_excludes_created_in_window_decided_outside(self):
        created = timezone.make_aware(datetime(2025, 6, 1, 12, 0, 0))
        decided_inside = timezone.make_aware(datetime(2025, 6, 15, 12, 0, 0))
        decided_outside = timezone.make_aware(datetime(2024, 1, 15, 12, 0, 0))
        inside = self._make_case(
            data_label="in_window",
            record_label="r1",
            dataset_id="ds-in",
            visible_label="In",
            tags=["2026"],
            created_at=created,
            decided_at=decided_inside,
        )
        self._make_case(
            data_label="out_window",
            record_label="r2",
            dataset_id="ds-out",
            visible_label="Out",
            tags=["2026"],
            created_at=created,
            decided_at=decided_outside,
        )
        self._make_case(
            data_label="open_case",
            record_label="r3",
            dataset_id="ds-open",
            visible_label="Open",
            tags=["2026"],
            state="owner_open",
            created_at=created,
        )

        response = self._get(
            group_by="true",
            dateField="decided",
            startDate="2025-06-01",
            endDate="2025-06-30",
        )
        self.assertEqual(response.status_code, 200)
        rows = response.json()["summary_statistics"]
        self.assertEqual([row["data_label"] for row in rows], ["in_window"])
        self.assertEqual(response.json()["clocks"]["date_field"], "decided")
        self.assertEqual(inside.data_label, "in_window")

    def test_date_window_end_date_includes_same_day_afternoon(self):
        afternoon = timezone.make_aware(datetime(2025, 6, 30, 15, 0, 0))
        self._make_case(
            data_label="same_day",
            record_label="r1",
            dataset_id="ds-same",
            visible_label="Same",
            tags=["2026"],
            created_at=afternoon,
            decided_at=afternoon,
        )
        response = self._get(
            group_by="true",
            startDate="2025-06-30",
            endDate="2025-06-30",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [row["data_label"] for row in response.json()["summary_statistics"]],
            ["same_day"],
        )

    def test_reopened_null_decided_at_excluded_from_decided_mode(self):
        created = timezone.make_aware(datetime(2025, 6, 1, 12, 0, 0))
        self._make_case(
            data_label="reopened",
            record_label="r1",
            dataset_id="ds-reopen",
            visible_label="Reopen",
            tags=["2026"],
            state="owner_open",
            created_at=created,
            decided_at=None,
        )
        response = self._get(group_by="true", dateField="decided")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["summary_statistics"], [])

    def test_medians_use_clocked_durations(self):
        t0 = timezone.make_aware(datetime(2025, 1, 1, 0, 0, 0))
        self._make_case(
            data_label="a",
            record_label="r",
            dataset_id="ds",
            visible_label="A",
            tags=["2026"],
            submitted_at=t0,
            first_owner_open_at=t0 + timedelta(days=1),
            decided_at=t0 + timedelta(days=1),
        )
        self._make_case(
            data_label="b",
            record_label="r",
            dataset_id="ds",
            visible_label="B",
            tags=["2026"],
            submitted_at=t0,
            first_owner_open_at=t0 + timedelta(days=3),
            decided_at=t0 + timedelta(days=3),
        )
        response = self._get(group_by="true")
        self.assertEqual(response.status_code, 200)
        clocks = response.json()["clocks"]
        self.assertEqual(clocks["first_look_sample_size"], 2)
        self.assertEqual(clocks["decision_sample_size"], 2)
        self.assertEqual(clocks["median_time_to_first_look_seconds"], 2 * 86400)
        self.assertEqual(clocks["median_time_to_decision_seconds"], 2 * 86400)

    def test_empty_clocks_sample_is_null(self):
        self._make_case(
            data_label="open",
            record_label="r",
            dataset_id="ds",
            visible_label="Open",
            tags=["2026"],
            state="owner_open",
        )
        response = self._get(group_by="true")
        self.assertEqual(response.status_code, 200)
        clocks = response.json()["clocks"]
        self.assertEqual(clocks["first_look_sample_size"], 0)
        self.assertEqual(clocks["decision_sample_size"], 0)
        self.assertIsNone(clocks["median_time_to_first_look_seconds"])
        self.assertIsNone(clocks["median_time_to_decision_seconds"])

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

    def test_fulfillment_omits_not_applicable_and_non_accepted(self):
        self._make_case(
            data_label="hist",
            record_label="r",
            dataset_id="ds-hist",
            visible_label="Hist",
            tags=["2026"],
            state="accepted",
            fulfillment_status=Negotiation.FULFILLMENT_NOT_APPLICABLE,
        )
        self._make_case(
            data_label="pend",
            record_label="r",
            dataset_id="ds-pend",
            visible_label="Pend",
            tags=["2026"],
            state="accepted",
            fulfillment_status=Negotiation.FULFILLMENT_PENDING,
        )
        self._make_case(
            data_label="del",
            record_label="r",
            dataset_id="ds-del",
            visible_label="Del",
            tags=["2026"],
            state="accepted",
            fulfillment_status=Negotiation.FULFILLMENT_DELIVERED,
        )
        self._make_case(
            data_label="with",
            record_label="r",
            dataset_id="ds-with",
            visible_label="With",
            tags=["2026"],
            state="accepted",
            fulfillment_status=Negotiation.FULFILLMENT_WITHDRAWN,
        )
        self._make_case(
            data_label="rej",
            record_label="r",
            dataset_id="ds-rej",
            visible_label="Rej",
            tags=["2026"],
            state="rejected",
            fulfillment_status=Negotiation.FULFILLMENT_PENDING,
        )
        self._make_case(
            data_label="open",
            record_label="r",
            dataset_id="ds-open",
            visible_label="Open",
            tags=["2026"],
            state="owner_open",
        )

        response = self._get(group_by="true")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(
            body["fulfillment"],
            {"pending": 1, "delivered": 1, "withdrawn": 1},
        )
        accepted = sum(row["accepted_requests"] for row in body["summary_statistics"])
        self.assertEqual(accepted, 4)

    def test_fulfillment_is_filter_scoped_not_grouped(self):
        self._make_case(
            data_label="keep",
            record_label="r1",
            dataset_id="ds-keep",
            visible_label="Keep",
            tags=["keep"],
            state="accepted",
            fulfillment_status=Negotiation.FULFILLMENT_PENDING,
        )
        self._make_case(
            data_label="drop",
            record_label="r2",
            dataset_id="ds-drop",
            visible_label="Drop",
            tags=["other"],
            state="accepted",
            fulfillment_status=Negotiation.FULFILLMENT_DELIVERED,
        )
        response = self._get(group_by="true", tags=["keep"])
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["summary_statistics"]), 1)
        self.assertNotIn("fulfillment", body["summary_statistics"][0])
        self.assertEqual(
            body["fulfillment"],
            {"pending": 1, "delivered": 0, "withdrawn": 0},
        )


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
