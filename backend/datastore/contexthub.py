"""ContextHub datastore client (replaces GitHub file fetches).

DRT talks to ContextHub over HTTP. Azure stays on the ContextHub side.
"""

import logging
import os
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)

DRT_API_PREFIX = "/api/v1/drt"


def _base_url():
    return (os.environ.get("CONTEXT_HUB_URL") or "").strip().rstrip("/")


def _api_key():
    return (os.environ.get("CONTEXT_HUB_API_KEY") or "").strip()


def fetch_json(path):
    """GET /api/v1/drt/{path} and return parsed JSON, or None on 404/error."""
    base = _base_url()
    if not base:
        logger.error("CONTEXT_HUB_URL is not set")
        return None

    url = f"{base}{DRT_API_PREFIX}/{path.lstrip('/')}"
    headers = {}
    key = _api_key()
    if key:
        headers["X-DRT-API-KEY"] = key

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            logger.error(
                "ContextHub %s returned %s", url, response.status_code
            )
            return None
        return response.json()
    except requests.exceptions.Timeout:
        logger.error("Timeout fetching from ContextHub: %s", url)
        return None
    except Exception as exc:
        logger.error("Error fetching from ContextHub %s: %s", url, exc)
        return None


def fetch_questionnaire(said):
    return fetch_json(f"questionnaires/{quote(said, safe='')}")


def fetch_license(license_id):
    return fetch_json(f"licenses/{quote(license_id, safe='')}")


def fetch_link_table():
    return fetch_json("link-table")


def fetch_owner_table():
    return fetch_json("owner-table")


def link_table_from_payload(payload):
    """Map ContextHub link-table JSON to DRT's Redis link_table dict."""
    table = {}
    if not payload:
        return table

    for row in payload.get("links") or []:
        link_uuid = (row.get("linkUuid") or "").strip()
        if not link_uuid:
            continue
        tags = row.get("tags") or []
        if isinstance(tags, str):
            tags = [part.strip() for part in tags.split(",") if part.strip()]
        visible = (row.get("visibleLabel") or row.get("dataLabel") or "").strip()
        table[link_uuid] = {
            "questionnaire_id": row.get("questionnaireId") or "",
            "license_id": row.get("licenseId") or "",
            "owner_id": row.get("ownerId") or "",
            "expiry": row.get("expiry") or "",
            "data_label": row.get("dataLabel") or "",
            "tags": tags,
            "record_label": row.get("recordLabel") or "",
            "visible_label": visible,
            "link_uuid": link_uuid,
        }
    return table


def owner_table_from_payload(payload):
    """Map ContextHub owner-table JSON to DRT's Redis owner_table dict."""
    table = {}
    if not payload:
        return table

    for row in payload.get("owners") or []:
        owner_id = row.get("ownerId")
        if not owner_id:
            continue
        table[owner_id] = {
            "username": row.get("username") or "",
            "owner_email": row.get("ownerEmail") or "",
        }
    return table


def said_indexes_from_links(link_table):
    """Build SAID → SAID maps so HOT_CACHE_KEYS stay populated without filename CSVs."""
    questionnaires = {}
    licenses = {}
    for entry in (link_table or {}).values():
        qid = entry.get("questionnaire_id")
        lid = entry.get("license_id")
        if qid:
            questionnaires[qid] = qid
        if lid:
            licenses[lid] = lid
    return questionnaires, licenses
