from django.core.cache import cache
from django.http import JsonResponse
import requests
import base64
import csv
import io
from drt.models import Owner, Questionnaire 
from django.views.decorators.csrf import csrf_exempt

GITHUB_API_URL = "https://api.github.com/repos/ClimateSmartAgCollab/DRT-DS-test/contents"
GITHUB_TOKEN = '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'

# Helper function to fetch a file from GitHub
def fetch_file_from_github(file_path):
    url = f"{GITHUB_API_URL}/{file_path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}'}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        content = base64.b64decode(response.json()['content']).decode('utf-8')
        return content
    return None

# View to load GitHub data and store it in the cache and database
def load_github_data(request):
    owner_table_csv = fetch_file_from_github('owner_table.csv')
    
    link_table_csv = fetch_file_from_github('linktable.csv')

    questionnaire_table_csv = fetch_file_from_github('source_library/questionnaire_table.csv')

    sample_questionnaire_json = fetch_file_from_github('source_library/sample_questionnaire_package.json')

    if owner_table_csv:
        owner_table = {}  
        reader = csv.DictReader(io.StringIO(owner_table_csv))
        for row in reader:
            owner_table[row['username']] = row['owner_email']
            owner, created = Owner.objects.get_or_create(owner_id=row['username'], email=row['owner_email'])
        cache.set('owner_table', owner_table)

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
        cache.set('link_table', link_table)

    if questionnaire_table_csv:
        questionnaire_table = {}
        reader = csv.DictReader(io.StringIO(questionnaire_table_csv))
        for row in reader:
            questionnaire_table[row['questionnaire_SAID']] = row['questionnaire_filename']
        cache.set('questionnaire_table', questionnaire_table)

    if sample_questionnaire_json:
        # questionnaire_json_data = base64.b64decode(sample_questionnaire_json).decode('utf-8')
        cache.set('sample_questionnaire_package', sample_questionnaire_json)

    return JsonResponse({'status': 'GitHub data loaded successfully and cached'})


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
