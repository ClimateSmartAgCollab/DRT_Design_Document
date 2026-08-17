"""Cache-layer tests for the datastore app.

These tests run against Django's in-memory LocMemCache so they do not need a
Redis server. They cover the highest-risk paths:

  * `refresh_data_task` actually invokes `warm_github_cache` (regression for the
    silently broken import).
  * `warm_github_cache` populates all HOT_CACHE_KEYS on a cold cache.
  * The "already warm" skip guard is truthy-based, so an empty dict is not
    treated as warm.
  * The inflight `cache.add` lock only lets one caller win.
  * `fetch_questionnaire_task` releases the inflight lock even when the
    upstream fetch fails (otherwise retries would be blocked for 30s).
"""

import hashlib
import hmac
import json
import os
from unittest.mock import patch

from django.core.cache import cache
from django.test import Client, TestCase, override_settings

from datastore import views as datastore_views
from datastore.cache_keys import (
    HOT_CACHE_KEYS,
    KEY_LICENSE_TABLE,
    KEY_LINK_TABLE,
    KEY_OWNER_TABLE,
    KEY_QUESTIONNAIRE_TABLE,
    license_template_key,
    questionnaire_inflight_key,
    questionnaire_json_key,
)
from datastore import contexthub as contexthub_client


OWNER_CSV = "owner_id,username,owner_email\nowner-1,user-1,owner1@example.com\n"
LINK_CSV = (
    "link_uuid,link,questionnaire_id,license_id,owner_id,expiry,data_label,"
    "tags,record_label,visible_label\n"
    "link-uuid-1,,q-001,l-001,owner-1,2030-01-01,Dataset A,tag1,rec-1,Visible A\n"
)
QUESTIONNAIRE_CSV = (
    "questionnaire_SAID,questionnaire_filename\n"
    "q-001,q-001.json\n"
)
LICENSE_CSV = "license_SAID,license_filename\nl-001,l-001.txt\n"


def _fake_fetch_file_from_github(path):
    """Return canned CSVs / license content; ignore questionnaire JSON fetches."""
    if path == "owner_table.csv":
        return OWNER_CSV
    if path == "linktable.csv":
        return LINK_CSV
    if path == "source_library/questionnaire_table.csv":
        return QUESTIONNAIRE_CSV
    if path == "source_library/license_table.csv":
        return LICENSE_CSV
    if path.startswith("source_library/license/"):
        return "license-template-body"
    return None


@override_settings(CACHES={
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
})
class WarmGithubCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        env = patch.dict(os.environ, {"DATASTORE_BACKEND": "github"})
        env.start()
        self.addCleanup(env.stop)

    @patch("datastore.views.fetch_file_from_github",
           side_effect=_fake_fetch_file_from_github)
    def test_warm_populates_all_hot_keys(self, _mock_fetch):
        result = datastore_views.warm_github_cache()
        self.assertTrue(result.get("ok"))
        for key in HOT_CACHE_KEYS:
            self.assertTrue(
                cache.get(key),
                f"Expected {key} to be populated by warm_github_cache",
            )

    @patch("datastore.views.fetch_file_from_github",
           side_effect=_fake_fetch_file_from_github)
    def test_warm_skips_github_when_all_keys_warm(self, mock_fetch):
        for key in HOT_CACHE_KEYS:
            cache.set(key, {"present": True})

        result = datastore_views.warm_github_cache()

        self.assertEqual(result.get("status"), "already cached")
        mock_fetch.assert_not_called()

    @patch("datastore.views.fetch_file_from_github",
           side_effect=_fake_fetch_file_from_github)
    def test_warm_runs_when_a_key_is_empty(self, mock_fetch):
        # Three keys present and non-empty; one key present but EMPTY -> should re-warm.
        cache.set(KEY_OWNER_TABLE, {"present": True})
        cache.set(KEY_LINK_TABLE, {"present": True})
        cache.set(KEY_QUESTIONNAIRE_TABLE, {"present": True})
        cache.set(KEY_LICENSE_TABLE, {})

        datastore_views.warm_github_cache()

        # Guard fix (Step 4): the empty dict should NOT count as warm.
        mock_fetch.assert_called()
        self.assertTrue(cache.get(KEY_LICENSE_TABLE))


@override_settings(CACHES={
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
})
class InflightLockTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_inflight_lock_allows_only_one_winner(self):
        key = questionnaire_inflight_key("q-123")
        self.assertTrue(cache.add(key, 1, timeout=30))
        self.assertFalse(cache.add(key, 1, timeout=30))

    @patch("datastore.views.fetch_questionnaire_json", return_value=None)
    def test_fetch_task_releases_inflight_lock_on_failure(self, _mock_fetch):
        """A failed fetch must clear the lock so retries are not blocked 30s."""
        from drt.tasks import fetch_questionnaire_task

        cache.add(questionnaire_inflight_key("q-fail"), 1, timeout=30)

        fetch_questionnaire_task("q-fail")

        self.assertIsNone(
            cache.get(questionnaire_inflight_key("q-fail")),
            "fetch_questionnaire_task should release the inflight lock even on failure",
        )

    @patch("datastore.views.fetch_questionnaire_json", return_value={"ok": True})
    def test_fetch_task_caches_result_and_releases_lock(self, _mock_fetch):
        from drt.tasks import fetch_questionnaire_task

        cache.add(questionnaire_inflight_key("q-ok"), 1, timeout=30)

        fetch_questionnaire_task("q-ok")

        self.assertEqual(cache.get(questionnaire_json_key("q-ok")), {"ok": True})
        self.assertIsNone(cache.get(questionnaire_inflight_key("q-ok")))


WEBHOOK_SECRET = "test-webhook-secret"


def _github_signature(body: bytes, secret: str = WEBHOOK_SECRET) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


@override_settings(CACHES={
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
})
class GithubWebhookTests(TestCase):
    def setUp(self):
        self.client = Client()
        cache.clear()
        env = patch.dict(os.environ, {"DATASTORE_BACKEND": "github"})
        env.start()
        self.addCleanup(env.stop)

    @patch.dict(os.environ, {"GITHUB_WEBHOOK_SECRET": WEBHOOK_SECRET})
    def test_rejects_missing_signature(self):
        response = self.client.post(
            "/datastore/webhook/",
            data=b"{}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    @patch.dict(os.environ, {"GITHUB_WEBHOOK_SECRET": WEBHOOK_SECRET})
    def test_rejects_invalid_signature(self):
        body = b'{"ref": "refs/heads/main"}'
        response = self.client.post(
            "/datastore/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256="sha256=invalid",
            HTTP_X_GITHUB_EVENT="push",
        )
        self.assertEqual(response.status_code, 401)

    @patch.dict(os.environ, {"GITHUB_WEBHOOK_SECRET": WEBHOOK_SECRET})
    def test_ping_does_not_invalidate_cache(self):
        cache.set(KEY_OWNER_TABLE, {"owner": True})
        body = b'{"zen": "test"}'
        response = self.client.post(
            "/datastore/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256=_github_signature(body),
            HTTP_X_GITHUB_EVENT="ping",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(cache.get(KEY_OWNER_TABLE), {"owner": True})

    @patch.dict(os.environ, {"GITHUB_WEBHOOK_SECRET": WEBHOOK_SECRET})
    @patch("datastore.views.refresh_data_task.delay")
    @patch("datastore.views.cache.delete_pattern", create=True)
    def test_push_to_main_invalidates_cache(self, _mock_delete_pattern, mock_delay):
        for key in HOT_CACHE_KEYS:
            cache.set(key, {"warm": True})

        body = json.dumps({"ref": "refs/heads/main"}).encode()
        response = self.client.post(
            "/datastore/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256=_github_signature(body),
            HTTP_X_GITHUB_EVENT="push",
        )

        self.assertEqual(response.status_code, 200)
        mock_delay.assert_called_once()
        for key in HOT_CACHE_KEYS:
            self.assertIsNone(cache.get(key))

    @patch.dict(os.environ, {"GITHUB_WEBHOOK_SECRET": WEBHOOK_SECRET})
    @patch("datastore.views.refresh_data_task.delay")
    def test_push_to_other_branch_is_ignored(self, mock_delay):
        cache.set(KEY_OWNER_TABLE, {"owner": True})
        body = json.dumps({"ref": "refs/heads/dev"}).encode()
        response = self.client.post(
            "/datastore/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256=_github_signature(body),
            HTTP_X_GITHUB_EVENT="push",
        )

        self.assertEqual(response.status_code, 200)
        mock_delay.assert_not_called()
        self.assertEqual(cache.get(KEY_OWNER_TABLE), {"owner": True})


class RefreshDataTaskTests(TestCase):
    """Regression test for the broken `refresh_data_task` import.

    Before the fix, the task imported a non-existent `refresh_data` symbol, so
    every webhook + Beat run cleared the cache and never refilled it.
    """

    @patch("datastore.views.warm_github_cache")
    def test_refresh_data_task_calls_warm_github_cache(self, mock_warm):
        from drt.tasks import refresh_data_task

        mock_warm.return_value = {"ok": True, "status": "loaded", "elapsed_time": 0.0}

        refresh_data_task()

        mock_warm.assert_called_once()


LINK_PAYLOAD = {
    "schemaVersion": "drt-link-table/v1",
    "links": [
        {
            "linkUuid": "75cb9450-01af-40b2-9cd5-e7fb0d82b59d",
            "visibleLabel": "Basic Data Request",
            "questionnaireId": "EKwwo0ojFOyZGK10QhgKK-xo1axX2xl1aSs8_8yD-fK3",
            "licenseId": "ECgkXgYg_5GM6Jnj6t3zzlz3uVmMtfJ9B2KcyjZDPTIs",
            "ownerId": "92md42wd",
            "expiry": "2026-11-18",
            "dataLabel": "basic_data_request",
            "tags": ["2026", "basic_data_request"],
            "recordLabel": "basic_data_request_26",
        }
    ],
}

OWNER_PAYLOAD = {
    "schemaVersion": "drt-owner-table/v1",
    "owners": [
        {
            "ownerId": "92md42wd",
            "username": "alice",
            "ownerEmail": "alice@example.com",
        }
    ],
}


class ContextHubMapperTests(TestCase):
    def test_link_table_maps_camel_case_and_keys_by_uuid(self):
        table = contexthub_client.link_table_from_payload(LINK_PAYLOAD)
        entry = table["75cb9450-01af-40b2-9cd5-e7fb0d82b59d"]
        self.assertEqual(entry["questionnaire_id"], LINK_PAYLOAD["links"][0]["questionnaireId"])
        self.assertEqual(entry["license_id"], LINK_PAYLOAD["links"][0]["licenseId"])
        self.assertEqual(entry["owner_id"], "92md42wd")
        self.assertEqual(entry["visible_label"], "Basic Data Request")
        self.assertEqual(entry["tags"], ["2026", "basic_data_request"])

    def test_owner_table_maps_owner_email(self):
        table = contexthub_client.owner_table_from_payload(OWNER_PAYLOAD)
        self.assertEqual(table["92md42wd"]["owner_email"], "alice@example.com")
        self.assertEqual(table["92md42wd"]["username"], "alice")

    def test_said_indexes_use_said_as_value(self):
        link_table = contexthub_client.link_table_from_payload(LINK_PAYLOAD)
        questionnaires, licenses = contexthub_client.said_indexes_from_links(link_table)
        qid = LINK_PAYLOAD["links"][0]["questionnaireId"]
        lid = LINK_PAYLOAD["links"][0]["licenseId"]
        self.assertEqual(questionnaires[qid], qid)
        self.assertEqual(licenses[lid], lid)


@override_settings(CACHES={
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
})
class WarmContextHubCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        env = patch.dict(os.environ, {
            "DATASTORE_BACKEND": "contexthub",
            "CONTEXT_HUB_URL": "http://contexthub.test",
        })
        env.start()
        self.addCleanup(env.stop)

    @patch("datastore.contexthub.fetch_license", return_value={"jinja": "Hello {{ name }}"})
    @patch("datastore.contexthub.fetch_owner_table", return_value=OWNER_PAYLOAD)
    @patch("datastore.contexthub.fetch_link_table", return_value=LINK_PAYLOAD)
    def test_warm_populates_hot_keys_from_contexthub(
        self, _mock_links, _mock_owners, mock_license
    ):
        result = datastore_views.warm_github_cache()
        self.assertTrue(result.get("ok"))
        self.assertEqual(result.get("status"), "loaded")

        link_table = cache.get(KEY_LINK_TABLE)
        self.assertIn("75cb9450-01af-40b2-9cd5-e7fb0d82b59d", link_table)
        self.assertEqual(cache.get(KEY_OWNER_TABLE)["92md42wd"]["owner_email"], "alice@example.com")
        self.assertTrue(cache.get(KEY_QUESTIONNAIRE_TABLE))
        self.assertTrue(cache.get(KEY_LICENSE_TABLE))
        mock_license.assert_called()
        self.assertEqual(
            cache.get(license_template_key(LINK_PAYLOAD["links"][0]["licenseId"])),
            {"jinja": "Hello {{ name }}"},
        )

    @patch("datastore.views.fetch_file_from_github")
    @patch("datastore.contexthub.fetch_owner_table", return_value=OWNER_PAYLOAD)
    @patch("datastore.contexthub.fetch_link_table", return_value=None)
    def test_warm_fails_when_contexthub_link_table_missing(
        self, _mock_links, _mock_owners, mock_github
    ):
        result = datastore_views.warm_github_cache()
        self.assertFalse(result.get("ok"))
        mock_github.assert_not_called()

    @patch("datastore.views.fetch_file_from_github")
    def test_webhook_gone_when_not_github(self, mock_github):
        client = Client()
        response = client.post(
            "/datastore/webhook/",
            data=b"{}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 410)
        mock_github.assert_not_called()


@override_settings(CACHES={
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
})
class ContextHubFetchTests(TestCase):
    def setUp(self):
        cache.clear()
        env = patch.dict(os.environ, {"DATASTORE_BACKEND": "contexthub"})
        env.start()
        self.addCleanup(env.stop)
        cache.set(KEY_QUESTIONNAIRE_TABLE, {"q-said": "q-said"})
        cache.set(KEY_LICENSE_TABLE, {"l-said": "l-said"})

    @patch("datastore.contexthub.fetch_questionnaire", return_value={"capture_base": {}})
    @patch("datastore.views.fetch_file_from_github")
    def test_questionnaire_fetch_uses_contexthub(self, mock_github, mock_ch):
        result = datastore_views.fetch_questionnaire_json("q-said")
        self.assertEqual(result, {"capture_base": {}})
        mock_ch.assert_called_once_with("q-said")
        mock_github.assert_not_called()

    @patch("datastore.contexthub.fetch_license", return_value={"jinja": "body"})
    @patch("datastore.views.fetch_file_from_github")
    def test_license_fetch_uses_contexthub(self, mock_github, mock_ch):
        result = datastore_views.fetch_license_template("l-said")
        self.assertEqual(result, {"jinja": "body"})
        mock_ch.assert_called_once_with("l-said")
        mock_github.assert_not_called()


class ContextHubClientTests(TestCase):
    @patch("datastore.contexthub.requests.get")
    def test_fetch_json_sends_api_key(self, mock_get):
        env = patch.dict(os.environ, {
            "CONTEXT_HUB_URL": "http://ch.test/",
            "CONTEXT_HUB_API_KEY": "secret",
        })
        env.start()
        self.addCleanup(env.stop)
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"ok": True}

        result = contexthub_client.fetch_link_table()

        mock_get.assert_called_once()
        url = mock_get.call_args[0][0]
        headers = mock_get.call_args.kwargs["headers"]
        self.assertEqual(url, "http://ch.test/api/v1/drt/link-table")
        self.assertEqual(headers["X-DRT-API-KEY"], "secret")
        self.assertEqual(result, {"ok": True})
