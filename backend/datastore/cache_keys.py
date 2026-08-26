"""Central registry of Redis cache keys and TTLs for the datastore.

Use these constants and helpers instead of inline strings/integers so that key
names and timeouts stay in sync across the backend. Auth-related cache keys
(magic tokens, login flags) are intentionally not included here -- they use a
different `email`-based naming scheme and live alongside the auth views.
"""

TTL_24H = 60 * 60 * 24
TTL_30S = 30
TTL_PREWARM_LOCK = 60

KEY_OWNER_TABLE = "owner_table"
KEY_LINK_TABLE = "link_table"
KEY_QUESTIONNAIRE_TABLE = "questionnaire_table"
KEY_LICENSE_TABLE = "license_table"
KEY_DATASTORE_PREWARM_LOCK = "datastore_prewarm_lock"

HOT_CACHE_KEYS = (
    KEY_OWNER_TABLE,
    KEY_LINK_TABLE,
    KEY_QUESTIONNAIRE_TABLE,
    KEY_LICENSE_TABLE,
)


def questionnaire_json_key(questionnaire_id: str) -> str:
    return f"questionnaire_json_{questionnaire_id}"


def license_template_key(license_id: str) -> str:
    return f"license_template_{license_id}"


def questionnaire_inflight_key(questionnaire_id: str) -> str:
    return f"questionnaire_fetch_inflight:{questionnaire_id}"
