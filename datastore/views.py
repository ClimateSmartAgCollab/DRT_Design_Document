from django.core.cache import cache
from django.http import JsonResponse
import requests
import base64
import csv
import io
from django.views.decorators.csrf import csrf_exempt

GITHUB_API_URL = "https://api.github.com/repos/ClimateSmartAgCollab/DRT-DS-test/contents"
GITHUB_TOKEN = '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'

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
        cache.set('owner_table', owner_table, timeout=86400)  # Cache for 1 day

    if link_table_csv:
        link_table = {} 
        reader = csv.DictReader(io.StringIO(link_table_csv))
        for row in reader:
            link_table[row['link']] = {
                'questionnaire_id': row['questionnaire_id'],
                'license_id': row['license_id'],
                'owner_id': row['owner_id'],
                'expiry': row['expiry'],
                'data_label': row['data_label']
            }
        cache.set('link_table', link_table, timeout=86400)  # Cache for 1 day

    if questionnaire_table_csv:
        questionnaire_table = {}
        reader = csv.DictReader(io.StringIO(questionnaire_table_csv))
        for row in reader:
            questionnaire_table[row['questionnaire_SAID']] = row['questionnaire_filename']
        cache.set('questionnaire_table', questionnaire_table, timeout=86400)  # Cache for 1 day

    if sample_questionnaire_json:
        cache.set('sample_questionnaire_package', sample_questionnaire_json, timeout=86400)  # Cache for 1 day
    if sample_questionnaire_json_1:
        cache.set('OCA_package_schema_paper', sample_questionnaire_json_1, timeout=86400)  # Cache for 1 day

    return JsonResponse({'status': 'GitHub data loaded successfully and cached'})

# View to retrieve cached data (for later use in the implementation)
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
        print("Webhook payload received: ", payload)
        load_github_data(request)
        return JsonResponse({'status': 'Webhook received, data reloaded'}, status=200)

    return JsonResponse({'error': 'Invalid request'}, status=400)
