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

logger = logging.getLogger(__name__)

GITHUB_API_URL = os.environ.get('GITHUB_API_URL')
if GITHUB_API_URL is None:
    raise ValueError("GITHUB_API_URL environment variable is not set.")

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

# View to load GitHub data and store it only in cache
def load_github_data(request):
    owner_table_csv = fetch_file_from_github('owner_table.csv')
    link_table_csv = fetch_file_from_github('linktable.csv')
    questionnaire_table_csv = fetch_file_from_github('source_library/questionnaire_table.csv')
    license_table_csv = fetch_file_from_github('source_library/license_table.csv')

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
            link_table[row['link']] = {
                'questionnaire_id': row['questionnaire_id'],
                'license_id': row['license_id'],
                'owner_id': row['owner_id'],
                'expiry': row['expiry'],
                'data_label': row['data_label'],
                'tags': row['tags'].split(',') if row['tags'] else [],
                'record_label': row['record_label'],
            }
        cache.set('link_table', link_table, timeout=60*60*24)

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
        cache.set('license_table', license_table, timeout=60*60*24)
        
        # Pre-load license templates after loading the license table
        preload_license_templates()

    return JsonResponse({'message': 'Data loaded successfully'})

# New function to fetch questionnaire JSON by questionnaire_id
def fetch_questionnaire_json(questionnaire_id):
    """
    Fetch questionnaire JSON from GitHub based on questionnaire_id.
    Returns the parsed JSON object or None if not found.
    """
    try:
        # Get questionnaire table from cache
        questionnaire_table = cache.get('questionnaire_table')
        if not questionnaire_table:
            # print("Questionnaire table not found in cache")
            return None
        
        # Look up the filename for the given questionnaire_id
        filename = questionnaire_table.get(questionnaire_id)
        if not filename:
            # print(f"Questionnaire ID {questionnaire_id} not found in questionnaire table")
            return None
        
        # Fetch the JSON file from GitHub
        json_content = fetch_file_from_github(f'source_library/questionnaires/{filename}')
        if json_content:
            # Parse the JSON content
            import json
            parsed_json = json.loads(json_content)
            
            # Cache the parsed questionnaire JSON for future use
            cache_key = f'questionnaire_json_{questionnaire_id}'
            cache.set(cache_key, parsed_json, timeout=60*60*24)  # Cache for 24 hours
            return parsed_json
        else:
            # print(f"Failed to fetch questionnaire JSON file: {filename}")
            return None
            
    except Exception as e:
        # print(f"Error fetching questionnaire JSON for {questionnaire_id}: {str(e)}")
        return None

def fetch_license_template(license_id):
    try:
        license_table = cache.get('license_table')
        print(license_table)
        if not license_table:
            # print("License table not found in cache")
            return None
        
        filename = license_table.get(license_id)
        print(filename)
        if not filename:
            # print(f"License ID {license_id} not found in license table")
            return None
        
        license_content = fetch_file_from_github(f'source_library/license/{filename}')
        print(license_content)
        if license_content:
            cache_key = f'license_template_{license_id}'
            cache.set(cache_key, license_content, timeout=60*60*24)  # Cache for 24 hours
            return license_content
        else:
            # print(f"Failed to fetch license template file: {filename}")
            return None
            
    except Exception as e:
        # print(f"Error fetching license template for {license_id}: {str(e)}")
        return None

def get_questionnaire_json(request, questionnaire_id):
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

def get_license_template(request, license_id):
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

def get_license_table(request):
    try:
        license_table = cache.get('license_table')
        if license_table:
            return JsonResponse({'license_table': license_table})
        else:
            return JsonResponse({'error': 'License table not found in cache'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': f'Error fetching license table: {str(e)}'}, status=500)

def get_cached_data(request, key):
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
        for license_id, filename in license_table.items():
            cache_key = f'license_template_{license_id}'
            if not cache.get(cache_key):
                try:
                    license_content = fetch_file_from_github(f'source_library/license/{filename}')
                    if license_content:
                        cache.set(cache_key, license_content, timeout=60*60*24)
                        logger.info(f"Pre-loaded license template: {license_id}")
                    else:
                        logger.warning(f"Failed to pre-load license template: {license_id}")
                except Exception as e:
                    logger.error(f"Error pre-loading license template {license_id}: {str(e)}")
        
        logger.info("License template pre-loading completed")
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
