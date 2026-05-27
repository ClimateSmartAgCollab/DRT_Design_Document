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

from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings

from datastore import views as datastore_views
from datastore.cache_keys import (
    HOT_CACHE_KEYS,
    KEY_LICENSE_TABLE,
    KEY_LINK_TABLE,
    KEY_OWNER_TABLE,
    KEY_QUESTIONNAIRE_TABLE,
    questionnaire_inflight_key,
    questionnaire_json_key,
)


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
