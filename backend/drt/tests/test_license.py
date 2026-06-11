from django.test import SimpleTestCase
from unittest.mock import MagicMock

from drt.services.license import build_license_context, flatten_form_data, render_license


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
    def test_email_alias_from_nlink_when_not_in_submission(self):
        nlink = MagicMock()
        nlink.data_label = "Dataset"
        nlink.record_label = "Record"
        nlink.visible_label = None
        nlink.tags = []
        nlink.requestor_email = "requestor@example.com"
        nlink.owner_id = "owner-1"
        nlink.license_id = "l-001"
        nlink.link_id = "link-1"

        context = build_license_context(
            submission_data={"name": "Alice"},
            nlink=nlink,
        )

        self.assertEqual(context["dr"]["email"], "requestor@example.com")
        self.assertEqual(context["dr"]["requestor_email"], "requestor@example.com")

    def test_submission_email_takes_precedence_over_nlink(self):
        nlink = MagicMock()
        nlink.data_label = "Dataset"
        nlink.record_label = "Record"
        nlink.visible_label = None
        nlink.tags = []
        nlink.requestor_email = "requestor@example.com"
        nlink.owner_id = "owner-1"
        nlink.license_id = "l-001"
        nlink.link_id = "link-1"

        context = build_license_context(
            submission_data={"email": "form@example.com"},
            nlink=nlink,
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
