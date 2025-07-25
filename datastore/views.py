from django.core.cache import cache
from django.http import JsonResponse
import requests
import base64
import csv
import io
from django.views.decorators.csrf import csrf_exempt
import os

GITHUB_API_URL = os.environ.get('GITHUB_API_URL')
if GITHUB_API_URL is None:
    raise ValueError("GITHUB_API_URL environment variable is not set.")

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

# Helper function to fetch a file from GitHub
def fetch_file_from_github(file_path):
    url = f"{GITHUB_API_URL}/{file_path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}'}
    response = requests.get(url, headers=headers)
    
    # print(response) 

    if response.status_code == 200:
        content = base64.b64decode(response.json()['content']).decode('utf-8')
        return content
    return None

# View to load GitHub data and store it only in cache
def load_github_data(request):
    owner_table_csv = fetch_file_from_github('owner_table.csv')
    link_table_csv = fetch_file_from_github('linktable.csv')
    questionnaire_table_csv = fetch_file_from_github('source_library/questionnaire_table.csv')
    sample_questionnaire_json = fetch_file_from_github('source_library/sample_questionnaire_package.json')
    sample_questionnaire_json_1 = fetch_file_from_github('source_library/OCA_package_schema_paper.json')

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

    if sample_questionnaire_json:
        cache.set('sample_questionnaire_package', sample_questionnaire_json, timeout=60*60*24)  
    if sample_questionnaire_json_1:
        cache.set('OCA_package_schema_paper', sample_questionnaire_json_1, timeout=60*60*24)

    return JsonResponse({'status': 'GitHub data loaded successfully and cached'})

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

# New view to get questionnaire JSON by questionnaire_id
def get_questionnaire_json(request, questionnaire_id):
    """
    API endpoint to get questionnaire JSON by questionnaire_id.
    First checks cache, then fetches from GitHub if not cached.
    """
    try:
        # Check if already cached
        cache_key = f'questionnaire_json_{questionnaire_id}'
        cached_json = cache.get(cache_key)
        
        if cached_json:
            return JsonResponse({'questionnaire': cached_json})
        
        # Fetch from GitHub
        json_content = fetch_questionnaire_json(questionnaire_id)
        if json_content:
            return JsonResponse({'questionnaire': json_content})
        else:
            return JsonResponse({'error': f'Questionnaire {questionnaire_id} not found'}, status=404)
            
    except Exception as e:
        return JsonResponse({'error': f'Error fetching questionnaire: {str(e)}'}, status=500)

# View to retrieve cached data
def get_cached_data(request, key):
    cached_data = cache.get(key)
    if cached_data is None:
        return JsonResponse({'error': f'No cached data found for key: {key}'}, status=404)
    return JsonResponse({key: cached_data})

# GitHub webhook to receive and handle updates from the GitHub repository
@csrf_exempt
def github_webhook(request):
    if request.method == 'POST':
        # Simulate handling the webhook
        payload = request.body.decode('utf-8')
        # print("Webhook payload received: ", payload)
        load_github_data(request)
        return JsonResponse({'status': 'Webhook received, data reloaded'}, status=200)

    return JsonResponse({'error': 'Invalid request'}, status=400)
