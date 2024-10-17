# forms.py
from django import forms
from django.core.cache import cache

class RequestorEmailForm(forms.Form):
    email = forms.EmailField(label='Enter your email', required=True)

class QuestionnaireForm(forms.Form):
    def __init__(self, questionnaire_SAID, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Fetch the schema from the cache using the provided questionnaire_SAID
        questionnaire_table = cache.get('questionnaire_table')
        if not questionnaire_table or questionnaire_SAID not in questionnaire_table:
            raise ValueError(f"Questionnaire with ID '{questionnaire_SAID}' not found in cache.")
        
        # Assume the schema is a JSON-like dictionary stored in the cache
        schema = cache.get(questionnaire_table[questionnaire_SAID])
        if not schema:
            raise ValueError(f"Schema for questionnaire '{questionnaire_SAID}' not found.")

        # Dynamically generate form fields based on the schema
        for field_name, field_properties in schema.items():
            field_type = field_properties.get('type', 'text')
            label = field_properties.get('label', field_name)
            required = field_properties.get('required', True)

            if field_type == 'text':
                self.fields[field_name] = forms.CharField(label=label, required=required)
            elif field_type == 'email':
                self.fields[field_name] = forms.EmailField(label=label, required=required)
            elif field_type == 'number':
                self.fields[field_name] = forms.IntegerField(label=label, required=required)
            elif field_type == 'date':
                self.fields[field_name] = forms.DateField(label=label, required=required)
            else:
                self.fields[field_name] = forms.CharField(label=label, required=required)

