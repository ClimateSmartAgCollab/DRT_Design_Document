from django.core.cache import cache
from django.http import JsonResponse
import requests
import base64
import csv
import io
from apps.drt.models import Owner, Questionnaire  # Import models from the drt app

GITHUB_API_URL = "https://api.github.com/repos/ClimateSmartAgCollab/DRT-DS-test/contents"
GITHUB_TOKEN = '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'

# Helper function to fetch a file from GitHub
def fetch_file_from_github(file_path):
    """
    Fetch a file from the GitHub repository using the GitHub API and return the decoded content.
    """
    url = f"{GITHUB_API_URL}/{file_path}"
    headers = {'Authorization': f'token {GITHUB_TOKEN}'}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        content = base64.b64decode(response.json()['content']).decode('utf-8')
        return content
    return None

# View to load GitHub data and store it in the cache and database
def load_github_data(request):
    """
    Fetches updated data from GitHub based on the new CSV and JSON file structure, 
    and stores them in Django cache and database.
    """

    # Fetch owner_table.csv
    owner_table_csv = fetch_file_from_github('owner_table.csv')
    
    # Fetch linktable.csv
    link_table_csv = fetch_file_from_github('linktable.csv')

    # Fetch source_library/questionnaire_table.csv
    questionnaire_table_csv = fetch_file_from_github('source_library/questionnaire_table.csv')

    # Fetch source_library/sample_questionnaire_package.json
    sample_questionnaire_json = fetch_file_from_github('source_library/sample_questionnaire_package.json')

    # Process owner_table.csv
    if owner_table_csv:
        owner_table = {}  # Dictionary to store owner table data
        reader = csv.DictReader(io.StringIO(owner_table_csv))
        for row in reader:
            # We now have 'username' and 'owner_email' instead of 'owner_id' and 'email'
            owner_table[row['username']] = row['owner_email']  # Caching owner data
            # Store in database
            owner, created = Owner.objects.get_or_create(owner_id=row['username'], email=row['owner_email'])
        cache.set('owner_table', owner_table)

    # Process linktable.csv
    if link_table_csv:
        link_table = {}  # Dictionary to store link table data
        reader = csv.DictReader(io.StringIO(link_table_csv))
        for row in reader:
            # Store the link, questionnaire_id, owner_id, etc.
            link_table[row['link']] = {
                'questionnaire_id': row['questionnaire_id'],
                'license_id': row['license_id'],
                'owner_id': row['owner_id'],
                'expiry': row['expiry'],
                'data_label': row['data_label']
            }
        cache.set('link_table', link_table)

    # Process source_library/questionnaire_table.csv
    if questionnaire_table_csv:
        questionnaire_table = {}
        reader = csv.DictReader(io.StringIO(questionnaire_table_csv))
        for row in reader:
            # Cache questionnaire SAID and filename mapping
            questionnaire_table[row['questionnaire_SAID']] = row['questionnaire_filename']
        cache.set('questionnaire_table', questionnaire_table)

    # Process sample_questionnaire_package.json
    if sample_questionnaire_json:
        # Store questionnaire JSON in cache
        questionnaire_json_data = base64.b64decode(sample_questionnaire_json).decode('utf-8')
        cache.set('sample_questionnaire_package', questionnaire_json_data)

    return JsonResponse({'status': 'GitHub data loaded successfully and cached'})

# GitHub webhook to receive and handle updates from the GitHub repository
def github_webhook(request):
    """
    This view handles GitHub webhook events such as pushes to the repository.
    It triggers updates to reload the relevant data from GitHub into the cache.
    """
    if request.method == 'POST':
        # Process the webhook payload (assuming it's a push event)
        payload = request.body.decode('utf-8')
        # We can handle specific events like 'push', 'delete', 'update'
        # Trigger the data reload (e.g., reload owner_table.csv and questionnaire_table.csv)
        load_github_data(request)  # Reload the GitHub data when a push is detected
        return JsonResponse({'status': 'Webhook received, data reloaded'}, status=200)

    return JsonResponse({'error': 'Invalid request'}, status=400)
