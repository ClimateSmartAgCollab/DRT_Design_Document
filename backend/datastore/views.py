import hashlib
import hmac
import os
from django.core.cache import cache
from django.http import JsonResponse
import requests
import base64
import csv
import io
from django.views.decorators.csrf import csrf_exempt
import logging
from drt.tasks import refresh_data_task
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import json

from .cache_keys import (
    HOT_CACHE_KEYS,
    KEY_LICENSE_TABLE,
    KEY_LINK_TABLE,
    KEY_OWNER_TABLE,
    KEY_QUESTIONNAIRE_TABLE,
    TTL_24H,
    license_template_key,
    questionnaire_json_key,
)
from . import contexthub

logger = logging.getLogger(__name__)

# Re-exported for backwards compatibility with any external callers that
# imported the constant directly from this module.
CACHE_TIMEOUT_24H = TTL_24H

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')


def datastore_backend():
    """contexthub (default) or github (rollback)."""
    return (os.environ.get("DATASTORE_BACKEND") or "contexthub").strip().lower()


def _github_api_url():
    return (os.environ.get("GITHUB_API_URL") or "").strip()


def fetch_file_from_github(file_path):
    url_root = _github_api_url()
    if not url_root:
        logger.error("GITHUB_API_URL is not set")
        return None
    url = f"{url_root}/{file_path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}'} if GITHUB_TOKEN else {}
    try:
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            content = base64.b64decode(response.json()['content']).decode('utf-8')
            return content
        return None
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching file from GitHub: {file_path}")
        return None
    except Exception as e:
        logger.error(f"Error fetching file from GitHub {file_path}: {str(e)}")
        return None


def warm_github_cache():
    """Load datastore tables into cache. Name kept for existing callers."""
    return warm_datastore_cache()


def warm_datastore_cache():
    """Load ContextHub (or GitHub) tables into cache and return status metadata."""
    try:
        if all(cache.get(k) for k in HOT_CACHE_KEYS):
            logger.info("warm_datastore_cache: cache already warm; skipping fetch")
            return {
                "ok": True,
                "status": "already cached",
                "message": "Core datastore tables already present in cache.",
            }

        if datastore_backend() == "github":
            return _warm_from_github()
        return _warm_from_contexthub()
    except Exception as e:
        logger.error(f"Error in warm_datastore_cache: {str(e)}")
        return {
            "ok": False,
            "error": f"Error loading data: {str(e)}",
        }


def _warm_from_contexthub():
    if not os.environ.get("CONTEXT_HUB_URL", "").strip():
        return {
            "ok": False,
            "error": "CONTEXT_HUB_URL is not set or empty.",
        }

    start_time = time.time()
    link_payload = contexthub.fetch_link_table()
    owner_payload = contexthub.fetch_owner_table()
    if link_payload is None:
        return {
            "ok": False,
            "error": "Failed to fetch link-table from ContextHub.",
        }
    if owner_payload is None:
        return {
            "ok": False,
            "error": "Failed to fetch owner-table from ContextHub.",
        }

    link_table = contexthub.link_table_from_payload(link_payload)
    owner_table = contexthub.owner_table_from_payload(owner_payload)
    questionnaire_table, license_table = contexthub.said_indexes_from_links(link_table)

    cache.set(KEY_LINK_TABLE, link_table, timeout=TTL_24H)
    cache.set(KEY_OWNER_TABLE, owner_table, timeout=TTL_24H)
    cache.set(KEY_QUESTIONNAIRE_TABLE, questionnaire_table, timeout=TTL_24H)
    cache.set(KEY_LICENSE_TABLE, license_table, timeout=TTL_24H)

    elapsed = time.time() - start_time
    logger.info("ContextHub datastore loaded in %.2f seconds", elapsed)

    if license_table:
        preload_license_templates()

    return {
        "ok": True,
        "status": "loaded",
        "message": "Data loaded successfully",
        "elapsed_time": elapsed,
    }


def _warm_from_github():
    if not _github_api_url():
        return {
            "ok": False,
            "error": "GITHUB_API_URL is not set or empty.",
        }

    start_time = time.time()
    file_paths = [
        'owner_table.csv',
        'linktable.csv',
        'source_library/questionnaire_table.csv',
        'source_library/license_table.csv'
    ]

    results = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(fetch_file_from_github, path): path for path in file_paths}
        for future in as_completed(futures):
            file_path = futures[future]
            try:
                results[file_path] = future.result()
            except Exception as e:
                logger.error(f"Error fetching {file_path}: {str(e)}")
                results[file_path] = None

    owner_table_csv = results.get('owner_table.csv')
    link_table_csv = results.get('linktable.csv')
    questionnaire_table_csv = results.get('source_library/questionnaire_table.csv')
    license_table_csv = results.get('source_library/license_table.csv')

    elapsed = time.time() - start_time
    logger.info(f"Parallel file fetch completed in {elapsed:.2f} seconds")
    print(f"[DATASTORE] Parallel file fetch completed in {elapsed:.2f} seconds")

    if owner_table_csv:
        owner_table = {}
        reader = csv.DictReader(io.StringIO(owner_table_csv))
        for row in reader:
            owner_table[row['owner_id']] = {
                'username': row['username'],
                'owner_email': row['owner_email']
            }
        cache.set(KEY_OWNER_TABLE, owner_table, timeout=TTL_24H)

    if link_table_csv:
        link_table = {}
        reader = csv.DictReader(io.StringIO(link_table_csv))
        for row in reader:
            link_uuid = row.get('link_uuid', '').strip()
            link_url = row.get('link', '').strip()
            visible_label = (row.get('visible_label') or row.get('data_label', '')).strip()
            entry = {
                'questionnaire_id': row['questionnaire_id'],
                'license_id': row['license_id'],
                'owner_id': row['owner_id'],
                'expiry': row['expiry'],
                'data_label': row['data_label'],
                'tags': row['tags'].split(',') if row.get('tags') else [],
                'record_label': row.get('record_label', ''),
                'visible_label': visible_label,
                'link_uuid': link_uuid or None,
            }
            key = link_uuid if link_uuid else link_url
            if key:
                link_table[key] = entry
        cache.set(KEY_LINK_TABLE, link_table, timeout=TTL_24H)

    if questionnaire_table_csv:
        questionnaire_table = {}
        reader = csv.DictReader(io.StringIO(questionnaire_table_csv))
        for row in reader:
            questionnaire_table[row['questionnaire_SAID']] = row['questionnaire_filename']
        cache.set(KEY_QUESTIONNAIRE_TABLE, questionnaire_table, timeout=TTL_24H)

    if license_table_csv:
        license_table = {}
        reader = csv.DictReader(io.StringIO(license_table_csv))
        for row in reader:
            license_table[row['license_SAID']] = row['license_filename']
        cache.set(KEY_LICENSE_TABLE, license_table, timeout=TTL_24H)

        preload_license_templates()

    return {
        "ok": True,
        "status": "loaded",
        "message": "Data loaded successfully",
        "elapsed_time": elapsed,
    }


def fetch_questionnaire_json(questionnaire_id):
    """Fetch questionnaire JSON by SAID. Returns parsed JSON or None."""
    try:
        questionnaire_table = cache.get(KEY_QUESTIONNAIRE_TABLE)
        if not questionnaire_table or questionnaire_id not in questionnaire_table:
            return None

        if datastore_backend() != "github":
            parsed_json = contexthub.fetch_questionnaire(questionnaire_id)
            if parsed_json:
                cache.set(
                    questionnaire_json_key(questionnaire_id),
                    parsed_json,
                    timeout=TTL_24H,
                )
            return parsed_json

        filename = questionnaire_table.get(questionnaire_id)
        if not filename:
            return None

        json_content = fetch_file_from_github(
            f"source_library/questionnaires/{filename}"
        )
        if json_content:
            parsed_json = json.loads(json_content)
            cache.set(
                questionnaire_json_key(questionnaire_id),
                parsed_json,
                timeout=TTL_24H,
            )
            return parsed_json
        return None

    except Exception as e:
        logger.error(f"Error fetching questionnaire JSON for {questionnaire_id}: {str(e)}")
        return None


def fetch_license_template(license_id):
    """Fetch license template by SAID. ContextHub returns JSON; GitHub may return text."""
    try:
        license_table = cache.get(KEY_LICENSE_TABLE)
        if not license_table or license_id not in license_table:
            return None

        if datastore_backend() != "github":
            license_content = contexthub.fetch_license(license_id)
            if license_content:
                cache.set(
                    license_template_key(license_id),
                    license_content,
                    timeout=TTL_24H,
                )
            return license_content

        filename = license_table.get(license_id)
        if not filename:
            return None

        license_content = fetch_file_from_github(
            f"source_library/license/{filename}"
        )
        if license_content:
            cache.set(license_template_key(license_id), license_content, timeout=TTL_24H)
            return license_content
        return None

    except Exception as e:
        logger.error(f"Error fetching license template for {license_id}: {str(e)}")
        return None

def get_questionnaire_json(_request, questionnaire_id):
    try:
        cached_json = cache.get(questionnaire_json_key(questionnaire_id))
        
        if cached_json:
            return JsonResponse({'questionnaire': cached_json})
        
        json_content = fetch_questionnaire_json(questionnaire_id)
        if json_content:
            return JsonResponse({'questionnaire': json_content})
        else:
            return JsonResponse({'error': f'Questionnaire {questionnaire_id} not found'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': f'Error fetching questionnaire: {str(e)}'}, status=500)

def get_license_template(_request, license_id):
    try:
        cached_template = cache.get(license_template_key(license_id))

        if cached_template:
            return JsonResponse({'license_template': cached_template})
        
        template_content = fetch_license_template(license_id)
        if template_content:
            return JsonResponse({'license_template': template_content})
        else:
            return JsonResponse({'error': f'License template {license_id} not found'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': f'Error fetching license template: {str(e)}'}, status=500)

def get_license_table(_request):
    try:
        license_table = cache.get(KEY_LICENSE_TABLE)
        if license_table:
            return JsonResponse({'license_table': license_table})
        else:
            return JsonResponse({'error': 'License table not found in cache'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': f'Error fetching license table: {str(e)}'}, status=500)

def get_cached_data(_request, key):
    cached_data = cache.get(key)
    if cached_data is None:
        return JsonResponse({'error': f'No cached data found for key: {key}'}, status=404)
    return JsonResponse({key: cached_data})

def preload_license_templates():
    """Pre-load all license templates into cache to avoid delays during license generation"""
    try:
        license_table = cache.get(KEY_LICENSE_TABLE)
        if not license_table:
            logger.warning("License table not found in cache, cannot preload templates")
            return
        
        logger.info("Pre-loading license templates into cache...")
        start_time = time.time()

        licenses_to_fetch = {}
        for license_id, filename in license_table.items():
            if not cache.get(license_template_key(license_id)):
                licenses_to_fetch[license_id] = filename

        if not licenses_to_fetch:
            logger.info("All license templates already cached")
            return

        use_github = datastore_backend() == "github"

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {}
            for license_id, filename in licenses_to_fetch.items():
                if use_github:
                    future = executor.submit(
                        fetch_file_from_github,
                        f"source_library/license/{filename}",
                    )
                else:
                    future = executor.submit(contexthub.fetch_license, license_id)
                futures[future] = license_id

            for future in as_completed(futures):
                license_id = futures[future]
                try:
                    license_content = future.result()
                    if license_content:
                        cache.set(
                            license_template_key(license_id),
                            license_content,
                            timeout=TTL_24H,
                        )
                        logger.info(f"Pre-loaded license template: {license_id}")
                    else:
                        logger.warning(f"Failed to pre-load license template: {license_id}")
                except Exception as e:
                    logger.error(f"Error pre-loading license template {license_id}: {str(e)}")
        
        elapsed = time.time() - start_time
        logger.info(f"License template pre-loading completed in {elapsed:.2f} seconds")
        print(f"[DATASTORE] License templates pre-loaded in {elapsed:.2f} seconds")
    except Exception as e:
        logger.error(f"Error in preload_license_templates: {str(e)}")


def _verify_github_signature(request) -> bool:
    """Return True if X-Hub-Signature-256 matches request.body."""
    secret = (os.environ.get("GITHUB_WEBHOOK_SECRET") or "").strip()
    if not secret:
        logger.error("GITHUB_WEBHOOK_SECRET is not configured")
        return False

    signature_header = request.headers.get("X-Hub-Signature-256", "")
    if not signature_header.startswith("sha256="):
        return False

    github_signature = signature_header[7:]
    our_signature = hmac.new(
        secret.encode("utf-8"),
        request.body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(our_signature, github_signature)


# GitHub webhook for automatic cache invalidation
@csrf_exempt
def github_webhook(request):
    """Webhook to clear cache and refresh data when GitHub changes."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    if datastore_backend() != "github":
        return JsonResponse(
            {"error": "GitHub webhook is disabled when DATASTORE_BACKEND is not github"},
            status=410,
        )

    if not _verify_github_signature(request):
        logger.warning(
            "GitHub webhook rejected: invalid or missing signature (delivery=%s)",
            request.headers.get("X-GitHub-Delivery", "unknown"),
        )
        return JsonResponse({"error": "Unauthorized"}, status=401)

    event = request.headers.get("X-GitHub-Event", "")
    delivery_id = request.headers.get("X-GitHub-Delivery", "unknown")

    if event == "ping":
        logger.info("GitHub webhook ping accepted (delivery=%s)", delivery_id)
        return JsonResponse({"status": "pong"}, status=200)

    if event != "push":
        return JsonResponse({"status": "ignored"}, status=200)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        logger.warning(
            "GitHub webhook push rejected: invalid JSON (delivery=%s)",
            delivery_id,
        )
        return JsonResponse({"error": "Bad request"}, status=400)

    if payload.get("ref") != "refs/heads/main":
        logger.info(
            "GitHub webhook push ignored for ref %s (delivery=%s)",
            payload.get("ref"),
            delivery_id,
        )
        return JsonResponse({"status": "ignored branch"}, status=200)

    try:
        for key in HOT_CACHE_KEYS:
            cache.delete(key)
        cache.delete_pattern("questionnaire_json_*")
        cache.delete_pattern("license_template_*")
        refresh_data_task.delay()
        logger.info("GitHub webhook push processed (delivery=%s)", delivery_id)
        return JsonResponse({"status": "Cache cleared, refresh started"}, status=200)
    except Exception as e:
        logger.error("Error processing webhook: %s", e, exc_info=True)
        return JsonResponse({"error": "Internal error"}, status=500)
