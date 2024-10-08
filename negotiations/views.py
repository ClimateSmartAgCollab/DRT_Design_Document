from django.shortcuts import render
from django.core.cache import cache

# Create your views here.

import requests
import base64

def fetch_questionnaire():
    cached_data = cache.get('questionnaire')
    if cached_data:
        return cached_data
        
    url = "https://api.github.com/repos/ClimateSmartAgCollab/DRT-DS-test/contents/source_library/sample_questionnaire_package.json"
    headers = {'Authorization': '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'}
    response = requests.get(url, headers=headers)

    # if response.status_code == 200:
    #     # file_content = json.loads(response.json()['content'])
    #     # cache.set('questionnaire', file_content, timeout=86400) # Cache for 1 day
    #     # return json.loads(file_content)
    #     return response.json()  # This will return the JSON response directly
    # else:
    #     return None

    
    if response.status_code == 200:
        try:
            # Attempt to decode the 'content' key from the response
            file_content = base64.b64decode(response.json().get('content')).decode('utf-8')
            return file_content
        except KeyError:
            print("Error: 'content' key not found in the response.")
        except base64.binascii.Error as e:
            print(f"Base64 decoding error: {e}")
    else:
        print(f"Error: Unable to fetch file from GitHub. Status Code: {response.status_code}")
        return None