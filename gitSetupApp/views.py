from django.shortcuts import render
from django.core.cache import cache

# Create your views here.

import requests
import base64

def fetch_questionnaire():
    cached_data = cache.get('questionnaire')
    if cached_data:
        return cached_data

#todo: Automate Updates Using GitHub Webhooks        
    url = "https://api.github.com/repos/ClimateSmartAgCollab/DRT-DS-test/contents/source_library/sample_questionnaire_package.json"
    headers = {'Authorization': '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'} #Toke for a limites time
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        file_content = base64.b64decode(response.json().get('content')).decode('utf-8')
        cache.set('questionnaire', file_content, timeout=86400) # Cache for 1 day
        return file_content
    else:
        return None