from django.shortcuts import render
from django.core.cache import cache

# Create your views here.

import requests
import json

def fetch_questionnaire():
    cached_data = cache.get('questionnaire')
    if cached_data:
        return cached_data
        
    url = "https://github.com/ClimateSmartAgCollab/DRT-DS-test/blob/main/source_library/sample_questionnaire_package.json"
    headers = {'Authorization': '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'}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        file_content = json.loads(response.json()['content'])
        cache.set('questionnaire', file_content, timeout=86400) # Cache for 1 day
        return json.loads(file_content)
    else:
        return None



