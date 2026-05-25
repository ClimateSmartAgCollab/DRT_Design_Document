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

logger = logging.getLogger(__name__)

# Cache timeout: 24 hours in seconds
CACHE_TIMEOUT_24H = 60 * 60 * 24
HOT_CACHE_KEYS = ("owner_table", "link_table", "questionnaire_table", "license_table")

GITHUB_API_URL = (os.environ.get("GITHUB_API_URL") or "").strip()
if not GITHUB_API_URL:
    raise ValueError(
        "GITHUB_API_URL is not set or empty. Set it in .env / .env.production "
        "(see .env.example and .env.production.example)."
    )

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

# Helper function to fetch a file from GitHub
def fetch_file_from_github(file_path):
    url = f"{GITHUB_API_URL}/{file_path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}'}
    try:
        response = requests.get(url, headers=headers, timeout=10)  # 10 second timeout

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
    """Load GitHub-backed tables into cache and return status metadata."""
    try:
        if all(cache.get(k) is not None for k in HOT_CACHE_KEYS):
            logger.info("load_github_data: cache already warm; skipping GitHub fetch")
            return {
                "ok": True,
                "status": "already cached",
                "message": "Core datastore tables already present in cache.",
            }

        # Fetch all files in parallel using ThreadPoolExecutor
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
            cache.set('owner_table', owner_table, timeout=60*60*24)

        if link_table_csv:
            link_table = {}
            reader = csv.DictReader(io.StringIO(link_table_csv))
            for row in reader:
                # Support both new schema (link_uuid, visible_label) and old (link)
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
                # Prefer link_uuid as key for new schema; fall back to link for backward compatibility
                key = link_uuid if link_uuid else link_url
                if key:
                    link_table[key] = entry
            cache.set('link_table', link_table, timeout=CACHE_TIMEOUT_24H)

        if questionnaire_table_csv:
            questionnaire_table = {}
            reader = csv.DictReader(io.StringIO(questionnaire_table_csv))
            for row in reader:
                questionnaire_table[row['questionnaire_SAID']] = row['questionnaire_filename']
            cache.set('questionnaire_table', questionnaire_table, timeout=60*60*24)

        if license_table_csv:
            license_table = {}
            reader = csv.DictReader(io.StringIO(license_table_csv))
            for row in reader:
                license_table[row['license_SAID']] = row['license_filename']
            cache.set('license_table', license_table, timeout=CACHE_TIMEOUT_24H)
            
            # Pre-load license templates after loading the license table
            preload_license_templates()

        return {
            "ok": True,
            "status": "loaded",
            "message": "Data loaded successfully",
            "elapsed_time": elapsed,
        }
    except Exception as e:
        logger.error(f"Error in load_github_data view: {str(e)}")
        return {
            "ok": False,
            "error": f"Error loading data: {str(e)}",
        }


# View to load GitHub data and store it only in cache
@csrf_exempt
def load_github_data(_request):
    """HTTP wrapper around warm_github_cache."""
    result = warm_github_cache()
    if not result.get("ok"):
        return JsonResponse({"error": result.get("error", "Unknown error")}, status=500)
    return JsonResponse({
        "status": result.get("status"),
        "message": result.get("message"),
        "elapsed_time": result.get("elapsed_time"),
    })

# fetch questionnaire JSON by questionnaire_id
def fetch_questionnaire_json(questionnaire_id):
    """
    Fetch questionnaire JSON from GitHub based on questionnaire_id.
    Returns the parsed JSON object or None if not found.
    """
    try:
        questionnaire_table = cache.get('questionnaire_table')
        if not questionnaire_table:
            return None
        
        filename = questionnaire_table.get(questionnaire_id)
        if not filename:
            return None
        
        json_content = fetch_file_from_github(f'source_library/questionnaires/{filename}')
        if json_content:
            parsed_json = json.loads(json_content)
            cache_key = f'questionnaire_json_{questionnaire_id}'
            cache.set(cache_key, parsed_json, timeout=CACHE_TIMEOUT_24H)
            return parsed_json
        return None
            
    except Exception as e:
        logger.error(f"Error fetching questionnaire JSON for {questionnaire_id}: {str(e)}")
        return None

def fetch_license_template(license_id):
    try:
        license_table = cache.get('license_table')
        if not license_table:
            return None
        
        filename = license_table.get(license_id)
        if not filename:
            return None
        
        license_content = fetch_file_from_github(f'source_library/license/{filename}')
        if license_content:
            cache_key = f'license_template_{license_id}'
            cache.set(cache_key, license_content, timeout=CACHE_TIMEOUT_24H)
            return license_content
        return None
            
    except Exception as e:
        logger.error(f"Error fetching license template for {license_id}: {str(e)}")
        return None

def get_questionnaire_json(_request, questionnaire_id):
    try:
        cache_key = f'questionnaire_json_{questionnaire_id}'
        cached_json = cache.get(cache_key)
        
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
        cache_key = f'license_template_{license_id}'
        cached_template = cache.get(cache_key)
        
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
        license_table = cache.get('license_table')
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
        license_table = cache.get('license_table')
        if not license_table:
            logger.warning("License table not found in cache, cannot preload templates")
            return
        
        logger.info("Pre-loading license templates into cache...")
        start_time = time.time()
        
        # Collect licenses that need to be fetched
        licenses_to_fetch = {}
        for license_id, filename in license_table.items():
            cache_key = f'license_template_{license_id}'
            if not cache.get(cache_key):
                licenses_to_fetch[license_id] = filename
        
        if not licenses_to_fetch:
            logger.info("All license templates already cached")
            return
        
        # Fetch all licenses in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {}
            for license_id, filename in licenses_to_fetch.items():
                future = executor.submit(fetch_file_from_github, f'source_library/license/{filename}')
                futures[future] = license_id
            
            for future in as_completed(futures):
                license_id = futures[future]
                try:
                    license_content = future.result()
                    if license_content:
                        cache_key = f'license_template_{license_id}'
                        cache.set(cache_key, license_content, timeout=CACHE_TIMEOUT_24H)
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


# GitHub webhook for automatic cache invalidation
@csrf_exempt
def github_webhook(request):
    """Webhook to clear cache and refresh data when GitHub changes"""
    if request.method == 'POST':
        try:
            # Clear cache immediately
            cache.delete('owner_table')
            cache.delete('link_table')
            cache.delete('questionnaire_table')
            cache.delete('license_table')
            cache.delete_pattern('questionnaire_json_*')
            cache.delete_pattern('license_template_*')
            
            # Refresh data in background using Celery
            refresh_data_task.delay()
            
            return JsonResponse({'status': 'Cache cleared, refresh started'}, status=200)
            
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return JsonResponse({'error': 'Internal error'}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)
