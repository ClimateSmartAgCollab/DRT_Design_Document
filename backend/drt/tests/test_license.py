import hashlib
from unittest.mock import MagicMock, patch

from django.core import mail
from django.db.models.signals import post_save
from django.test import SimpleTestCase, TestCase, override_settings
from jinja2.sandbox import SecurityError

from drt.models import NLink, Negotiation
from drt.services.clocks import mark_reopened
from drt.services.license import (
    build_license_context,
    email_issued_license,
    flatten_form_data,
    generate_license_and_notify_owner,
    render_license,
)
from drt.views.stats import generate_summary_statistics


OWNER_EMAIL = "owner@example.com"
REQUESTOR_EMAIL = "requestor@example.com"
LICENSE_BODY = "LICENSE BODY"


class FlattenFormDataTests(SimpleTestCase):
    def test_strips_save_and_submit_flags(self):
        result = flatten_form_data({"name": "Alice", "save": True, "submit": False})
        self.assertEqual(result, {"name": "Alice"})

    def test_normalizes_dotted_field_ids(self):
        result = flatten_form_data({"step1": {"q10.5": "x"}})
        self.assertEqual(result, {"q10_5": "x"})
        self.assertNotIn("5", result)

    def test_namespaced_attributes_get_short_aliases(self):
        submission = {
            "requestor_step": {
                "requestor.name": "Alice",
                "requestor.email": "alice@example.com",
                "requestor.affiliation": "UofG",
                "requestor.location": "Canada",
            },
            "usage_step": {
                "usage.research_question": "Why?",
                "timespan": "12345566",
                "pub_date": "2026-06-02",
            },
        }
        result = flatten_form_data(submission)
        self.assertEqual(result["name"], "Alice")
        self.assertEqual(result["email"], "alice@example.com")
        self.assertEqual(result["affiliation"], "UofG")
        self.assertEqual(result["location"], "Canada")
        self.assertEqual(result["research_question"], "Why?")
        self.assertEqual(result["timespan"], "12345566")
        self.assertEqual(result["requestor_name"], "Alice")

    def test_child_records_get_short_aliases(self):
        submission = {
            "collaborators": {
                "childrenData": {
                    "child_step": [
                        {
                            "id": "1",
                            "data": {
                                "collaborator.name": "Bob",
                                "collaborator.data_access": "full",
                                "collaborator.data_time": "1 year",
                            },
                        },
                    ],
                },
            },
        }
        result = flatten_form_data(submission)
        item = result["collaborators"][0]
        self.assertEqual(item["name"], "Bob")
        self.assertEqual(item["data_access"], "full")
        self.assertEqual(item["data_time"], "1 year")

    def test_single_child_type_uses_parent_reference_key(self):
        submission = {
            "collaborators": {
                "childrenData": {
                    "child_step_abc": [
                        {"id": "1", "data": {"name": "Alice", "affiliation": "UofG"}},
                    ],
                },
            },
        }
        result = flatten_form_data(submission)
        self.assertEqual(result["collaborators"], [{"name": "Alice", "affiliation": "UofG"}])

    def test_multiple_child_types_use_child_step_keys(self):
        submission = {
            "parent_ref": {
                "childrenData": {
                    "child.type.a": [{"id": "1", "data": {"x": 1}}],
                    "child.type.b": [{"id": "2", "data": {"y": 2}}],
                },
            },
        }
        result = flatten_form_data(submission)
        self.assertEqual(result["child_type_a"], [{"x": 1}])
        self.assertEqual(result["child_type_b"], [{"y": 2}])
        self.assertNotIn("parent_ref", result)


class BuildLicenseContextTests(SimpleTestCase):
    def setUp(self):
        self.owner_table = {
            "owner-1": {"owner_email": "owner@example.com", "username": "owner"}
        }
        cache_patch = patch(
            "drt.services.license.cache.get",
            return_value=self.owner_table,
        )
        cache_patch.start()
        self.addCleanup(cache_patch.stop)

    def _nlink(self):
        nlink = MagicMock()
        nlink.data_label = "Dataset"
        nlink.record_label = "Record"
        nlink.visible_label = None
        nlink.tags = []
        nlink.requestor_email = "requestor@example.com"
        nlink.owner_id = "owner-1"
        nlink.license_id = "l-001"
        nlink.link_id = "link-1"
        return nlink

    def test_email_alias_from_nlink_when_not_in_submission(self):
        context = build_license_context(
            submission_data={"name": "Alice"},
            nlink=self._nlink(),
        )

        self.assertEqual(context["dr"]["email"], "requestor@example.com")
        self.assertEqual(context["dr"]["requestor_email"], "requestor@example.com")
        self.assertEqual(context["dr"]["owner_email"], "owner@example.com")
        self.assertNotIn("owner_table", context)

    def test_submission_email_takes_precedence_over_nlink(self):
        context = build_license_context(
            submission_data={"email": "form@example.com"},
            nlink=self._nlink(),
        )

        self.assertEqual(context["dr"]["email"], "form@example.com")


class RenderLicenseTests(SimpleTestCase):
    def test_multi_level_template_renders(self):
        template = {
            "jinja": (
                "{{ dr.name }}, {{ dr.email }}\n"
                "{% for item in collaborators %}"
                "{{ item.name }} - {{ item.affiliation }}\n"
                "{% endfor %}"
            ),
        }
        context = {
            "name": "Alice",
            "dr": {
                "name": "Alice",
                "email": "alice@example.com",
            },
            "collaborators": [
                {"name": "Bob", "affiliation": "UofG"},
            ],
        }
        rendered = render_license(template, context)
        self.assertIn("Alice, alice@example.com", rendered)
        self.assertIn("Bob - UofG", rendered)

    def test_sandbox_blocks_dunder_access(self):
        with self.assertRaises(SecurityError):
            render_license(
                {"jinja": "{{ func.__code__.co_code }}"},
                {"func": lambda: None},
            )


class IssuedLicensePersistTests(TestCase):
    def setUp(self):
        post_save.disconnect(generate_summary_statistics, sender=Negotiation)
        self.addCleanup(
            post_save.connect, generate_summary_statistics, sender=Negotiation
        )

    def _make_case(self):
        negotiation = Negotiation.objects.create(
            questionnaire_SAID="test-said",
            state="accepted",
            requestor_responses={"name": "Alice"},
        )
        nlink = NLink.objects.create(
            negotiation=negotiation,
            owner_id="owner-1",
            license_id="l-001",
            data_label="Dataset",
            record_label="Record",
            visible_label="Visible",
            tags=["2026"],
            requestor_email=REQUESTOR_EMAIL,
        )
        return negotiation, nlink

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    )
    @patch("drt.services.license.owner_email_for_nlink", return_value=OWNER_EMAIL)
    @patch("drt.services.license.render_license", return_value=LICENSE_BODY)
    @patch("drt.services.license._load_license_template", return_value="tmpl")
    def test_issue_persists_hash_and_emails_both_parties(
        self, _mock_load, _mock_render, _mock_owner
    ):
        negotiation, nlink = self._make_case()

        generate_license_and_notify_owner(nlink)

        negotiation.refresh_from_db()
        self.assertEqual(negotiation.issued_license_text, LICENSE_BODY)
        self.assertEqual(
            negotiation.issued_license_sha256,
            hashlib.sha256(LICENSE_BODY.encode("utf-8")).hexdigest(),
        )
        self.assertEqual(negotiation.issued_license_version, 1)
        self.assertEqual(negotiation.license_SAID, "l-001")
        self.assertIsNotNone(negotiation.issued_license_at)
        self.assertEqual(
            negotiation.archives.last().change_description, "Issued license v1"
        )
        self.assertEqual(len(mail.outbox), 2)
        self.assertCountEqual(
            [message.to[0] for message in mail.outbox],
            [OWNER_EMAIL, REQUESTOR_EMAIL],
        )
        for message in mail.outbox:
            self.assertEqual(message.attachments[0][1], LICENSE_BODY)

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    )
    @patch("drt.services.license.owner_email_for_nlink", return_value=OWNER_EMAIL)
    @patch("drt.services.license.render_license", return_value="SECOND BODY")
    @patch("drt.services.license._load_license_template", return_value="tmpl")
    def test_next_accept_overwrites_and_bumps_version(
        self, _mock_load, _mock_render, _mock_owner
    ):
        negotiation, nlink = self._make_case()
        Negotiation.objects.filter(pk=negotiation.pk).update(
            issued_license_text=LICENSE_BODY,
            issued_license_sha256="old",
            issued_license_version=1,
            license_SAID="l-001",
        )
        negotiation.refresh_from_db()

        generate_license_and_notify_owner(nlink)

        negotiation.refresh_from_db()
        self.assertEqual(negotiation.issued_license_text, "SECOND BODY")
        self.assertEqual(negotiation.issued_license_version, 2)
        self.assertEqual(
            negotiation.archives.last().change_description, "Issued license v2"
        )

    def test_reopen_leaves_issued_license(self):
        negotiation, _nlink = self._make_case()
        Negotiation.objects.filter(pk=negotiation.pk).update(
            issued_license_text=LICENSE_BODY,
            issued_license_sha256="abc",
            issued_license_version=1,
            license_SAID="l-001",
        )
        negotiation.refresh_from_db()

        self.assertTrue(mark_reopened(negotiation))
        negotiation.refresh_from_db()
        self.assertEqual(negotiation.issued_license_text, LICENSE_BODY)
        self.assertEqual(negotiation.issued_license_sha256, "abc")
        self.assertEqual(negotiation.issued_license_version, 1)
        self.assertEqual(negotiation.license_SAID, "l-001")

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    )
    @patch("drt.services.license.owner_email_for_nlink", return_value=OWNER_EMAIL)
    def test_resend_emails_stored_body_without_rerender(self, _mock_owner):
        negotiation, nlink = self._make_case()
        Negotiation.objects.filter(pk=negotiation.pk).update(
            issued_license_text=LICENSE_BODY,
            issued_license_version=1,
        )
        negotiation.refresh_from_db()
        nlink.refresh_from_db()

        with patch("drt.services.license.render_license") as mock_render:
            self.assertTrue(email_issued_license(nlink))
            mock_render.assert_not_called()

        self.assertEqual(len(mail.outbox), 2)
        for message in mail.outbox:
            self.assertEqual(message.attachments[0][1], LICENSE_BODY)

