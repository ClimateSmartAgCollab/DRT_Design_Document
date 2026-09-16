from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from json import dumps
from unittest.mock import patch

from django.conf import settings
from django.contrib.admin.sites import site
from django.db import connections
from django.test import SimpleTestCase, TestCase, TransactionTestCase
from django.urls import reverse
from django.utils import timezone

from drt.admin import NegotiationAdmin
from drt.models import NLink, Negotiation
from drt.services.clocks import (
    DESC_ABANDONED_INACTIVITY,
    DESC_ABANDONED_REQUESTOR,
    DESC_OWNER_ACCEPTED,
    DESC_OWNER_CLARIFICATION,
    DESC_OWNER_REJECTED,
    DESC_OWNER_SAVED,
    DESC_REOPENED_PREFIX,
    DESC_SUBMITTED,
    is_reopen_description,
    mark_first_owner_open,
    mark_submitted,
    reopen_description,
)
from drt.services.negotiation import (
    abandon_negotiation_by_requestor,
    mark_negotiation_abandoned,
)


OWNER_EMAIL = "owner@example.com"
REQUESTOR_EMAIL = "requestor@example.com"
OWNER_ID = "owner-clock-1"


class ClockDescriptionTests(SimpleTestCase):
    def test_reopen_description_uses_prefix(self):
        description = reopen_description("accepted")
        self.assertTrue(description.startswith(DESC_REOPENED_PREFIX))
        self.assertTrue(is_reopen_description(description))
        self.assertEqual(
            description, "Owner reopened negotiation from accepted state"
        )

    def test_empty_description_is_not_reopen(self):
        self.assertFalse(is_reopen_description(""))
        self.assertFalse(is_reopen_description(None))


class NegotiationAdminClockTests(SimpleTestCase):
    def test_clock_fields_are_readonly(self):
        admin = NegotiationAdmin(Negotiation, site)
        for field in (
            "submitted_at",
            "first_owner_open_at",
            "decided_at",
            "abandoned_at",
            "reopen_count",
        ):
            self.assertIn(field, admin.readonly_fields)


class ClockHelperTests(TestCase):
    def _make_negotiation(self, state="owner_open"):
        return Negotiation.objects.create(
            questionnaire_SAID="test-said",
            state=state,
        )

    def test_submitted_at_is_write_once(self):
        negotiation = self._make_negotiation("requestor_open")
        first = timezone.now()
        second = first + timedelta(days=1)

        self.assertTrue(mark_submitted(negotiation, at=first))
        self.assertFalse(mark_submitted(negotiation, at=second))

        negotiation.refresh_from_db()
        self.assertEqual(negotiation.submitted_at, first)

    def test_first_look_second_caller_loses(self):
        negotiation = self._make_negotiation()
        first = timezone.now()
        second = first + timedelta(hours=3)

        self.assertTrue(mark_first_owner_open(negotiation, at=first))
        self.assertFalse(mark_first_owner_open(negotiation, at=second))

        negotiation.refresh_from_db()
        self.assertEqual(negotiation.first_owner_open_at, first)


class FirstLookConcurrencyTests(TransactionTestCase):
    def test_two_callers_cannot_both_win_first_look(self):
        negotiation = Negotiation.objects.create(
            questionnaire_SAID="test-said",
            state="owner_open",
        )
        t1 = timezone.now()
        t2 = t1 + timedelta(hours=3)
        pk = negotiation.pk

        def call(at):
            try:
                row = Negotiation.objects.get(pk=pk)
                return mark_first_owner_open(row, at=at)
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(call, [t1, t2]))

        self.assertEqual(sum(1 for won in results if won), 1)
        negotiation.refresh_from_db()
        self.assertIn(negotiation.first_owner_open_at, (t1, t2))


class NegotiationClockWriterTests(TestCase):
    def setUp(self):
        self.requestor_patchers = [
            patch("drt.views.questionnaire.send_notification_emails_task"),
            patch("drt.views.questionnaire.generate_license_and_notify_owner_task"),
            patch("drt.views.questionnaire.send_rejection_email_task"),
            patch("drt.views.questionnaire.send_clarification_email_task"),
            patch("drt.views.stats.send_reopen_notification_email_task"),
            patch(
                "drt.services.negotiation.send_abandonment_notification_email_task"
            ),
        ]
        for patcher in self.requestor_patchers:
            patcher.start()
            self.addCleanup(patcher.stop)

    def _set_session(self, **kwargs):
        session = self.client.session
        for key, value in kwargs.items():
            session[key] = value
        session.save()
        self.client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key

    def _make_case(self, state="requestor_open", requestor_email=REQUESTOR_EMAIL):
        negotiation = Negotiation.objects.create(
            questionnaire_SAID="test-said",
            state=state,
        )
        nlink = NLink.objects.create(
            negotiation=negotiation,
            owner_id=OWNER_ID,
            dataset_ID="ds-1",
            data_label="basic_data_request",
            record_label="basic_a",
            visible_label="Basic A",
            tags=["2026"],
            requestor_email=requestor_email,
        )
        return negotiation, nlink

    def _submit(self, nlink):
        self._set_session(requestor_email=REQUESTOR_EMAIL)
        return self.client.post(
            reverse(
                "fill_questionnaire",
                kwargs={"link_id": str(nlink.requestor_link)},
            ),
            data='{"submit": true}',
            content_type="application/json",
        )

    def _owner_get(self, nlink, **query):
        with patch(
            "drt.views.questionnaire.cache.get",
            return_value={"title": "test questionnaire"},
        ):
            return self.client.get(
                reverse(
                    "owner_review",
                    kwargs={"link_id": str(nlink.owner_link)},
                ),
                data=query,
            )

    def _owner_post(self, nlink, payload):
        self._set_session(owner_email=OWNER_EMAIL)
        return self.client.post(
            reverse(
                "owner_review",
                kwargs={"link_id": str(nlink.owner_link)},
            ),
            data=dumps(payload),
            content_type="application/json",
        )

    def test_submit_sets_submitted_at_and_archive_constant(self):
        negotiation, nlink = self._make_case()
        before = timezone.now()

        response = self._submit(nlink)

        self.assertEqual(response.status_code, 200)
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.state, "owner_open")
        self.assertIsNotNone(negotiation.submitted_at)
        self.assertGreaterEqual(negotiation.submitted_at, before)
        self.assertEqual(
            negotiation.archives.last().change_description, DESC_SUBMITTED
        )

    def test_resubmit_after_clarification_does_not_clobber_submitted_at(self):
        negotiation, nlink = self._make_case()
        self._submit(nlink)
        negotiation.refresh_from_db()
        first_submitted = negotiation.submitted_at

        clarify = self._owner_post(
            nlink,
            {
                "request_clarification": True,
                "owner_responses": "",
                "comments": "",
            },
        )
        self.assertEqual(clarify.status_code, 200)
        self.assertEqual(
            negotiation.archives.last().change_description,
            DESC_OWNER_CLARIFICATION,
        )

        later = first_submitted + timedelta(days=2)
        with patch("drt.services.clocks.timezone.now", return_value=later):
            second = self._submit(nlink)
        self.assertEqual(second.status_code, 200)

        negotiation.refresh_from_db()
        self.assertEqual(negotiation.submitted_at, first_submitted)
        self.assertEqual(negotiation.state, "owner_open")

    def test_get_sets_first_look_once_without_bumping_last_activity(self):
        negotiation, nlink = self._make_case(state="owner_open")
        past = timezone.now() - timedelta(days=5)
        NLink.objects.filter(pk=nlink.pk).update(last_activity=past)

        first = self._owner_get(nlink)
        self.assertEqual(first.status_code, 200)
        negotiation.refresh_from_db()
        first_look = negotiation.first_owner_open_at
        self.assertIsNotNone(first_look)

        nlink.refresh_from_db()
        self.assertEqual(nlink.last_activity, past)

        later = first_look + timedelta(hours=4)
        with patch("drt.services.clocks.timezone.now", return_value=later):
            second = self._owner_get(nlink)
        self.assertEqual(second.status_code, 200)
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.first_owner_open_at, first_look)

    def test_get_on_requestor_open_does_not_set_first_look(self):
        negotiation, nlink = self._make_case(state="requestor_open")
        response = self._owner_get(nlink)
        self.assertEqual(response.status_code, 403)
        negotiation.refresh_from_db()
        self.assertIsNone(negotiation.first_owner_open_at)

    def test_save_sets_first_look_and_archive_constant(self):
        negotiation, nlink = self._make_case(state="owner_open")
        response = self._owner_post(
            nlink,
            {"save": True, "owner_responses": "{}", "comments": ""},
        )
        self.assertEqual(response.status_code, 200)
        negotiation.refresh_from_db()
        self.assertIsNotNone(negotiation.first_owner_open_at)
        self.assertEqual(
            negotiation.archives.last().change_description, DESC_OWNER_SAVED
        )

    def test_accept_sets_decided_at_and_first_look_fallback(self):
        negotiation, nlink = self._make_case(state="owner_open")
        response = self._owner_post(
            nlink,
            {"accept": True, "owner_responses": "", "comments": ""},
        )
        self.assertEqual(response.status_code, 200)
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.state, "accepted")
        self.assertIsNotNone(negotiation.decided_at)
        self.assertIsNotNone(negotiation.first_owner_open_at)
        self.assertEqual(
            negotiation.archives.last().change_description, DESC_OWNER_ACCEPTED
        )

    def test_reject_sets_decided_at(self):
        negotiation, nlink = self._make_case(state="owner_open")
        response = self._owner_post(
            nlink,
            {
                "reject": True,
                "rationale": "no",
                "owner_responses": "",
                "comments": "",
            },
        )
        self.assertEqual(response.status_code, 200)
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.state, "rejected")
        self.assertIsNotNone(negotiation.decided_at)
        self.assertEqual(
            negotiation.archives.last().change_description, DESC_OWNER_REJECTED
        )

    def test_inactivity_abandon_sets_abandoned_at(self):
        negotiation, _nlink = self._make_case(state="owner_open")
        self.assertTrue(mark_negotiation_abandoned(negotiation))
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.state, "abandoned")
        self.assertIsNotNone(negotiation.abandoned_at)
        self.assertIsNone(negotiation.decided_at)
        self.assertEqual(
            negotiation.archives.last().change_description,
            DESC_ABANDONED_INACTIVITY,
        )

    def test_requestor_abandon_sets_abandoned_at(self):
        negotiation, _nlink = self._make_case(state="requestor_open")
        self.assertTrue(abandon_negotiation_by_requestor(negotiation))
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.state, "abandoned")
        self.assertIsNotNone(negotiation.abandoned_at)
        self.assertEqual(
            negotiation.archives.last().change_description,
            DESC_ABANDONED_REQUESTOR,
        )

    def test_reopen_clears_current_cycle_clocks_and_keeps_first_touch(self):
        negotiation, nlink = self._make_case(state="owner_open")
        submitted = timezone.now() - timedelta(days=10)
        first_look = submitted + timedelta(days=1)
        decided = first_look + timedelta(days=1)
        reminder = decided + timedelta(hours=1)
        Negotiation.objects.filter(pk=negotiation.pk).update(
            submitted_at=submitted,
            first_owner_open_at=first_look,
            decided_at=decided,
            state="accepted",
            archived=True,
            reminder_sent=True,
            reminder_sent_date=reminder,
            reopen_count=0,
        )

        self._set_session(owner_email=OWNER_EMAIL)
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
        self.assertEqual(negotiation.submitted_at, submitted)
        self.assertEqual(negotiation.first_owner_open_at, first_look)
        self.assertIsNone(negotiation.decided_at)
        self.assertIsNone(negotiation.abandoned_at)
        self.assertFalse(negotiation.reminder_sent)
        self.assertIsNone(negotiation.reminder_sent_date)
        self.assertEqual(negotiation.reopen_count, 1)
        self.assertTrue(
            is_reopen_description(negotiation.archives.last().change_description)
        )

    def test_reopen_from_abandoned_increments_count(self):
        negotiation, nlink = self._make_case(state="abandoned")
        abandoned_at = timezone.now()
        Negotiation.objects.filter(pk=negotiation.pk).update(
            abandoned_at=abandoned_at,
            archived=True,
            reopen_count=1,
        )

        self._set_session(owner_email=OWNER_EMAIL)
        response = self.client.get(
            reverse(
                "reopen_negotiation",
                kwargs={"negotiation_id": negotiation.negotiation_id},
            )
        )
        self.assertEqual(response.status_code, 200)
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.reopen_count, 2)
        self.assertIsNone(negotiation.abandoned_at)
