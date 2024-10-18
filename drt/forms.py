from django import forms
from .models import Negotiation

class QuestionnaireForm(forms.ModelForm):
    def __init__(self, *args, questionnaire_SAID=None, **kwargs):
        super().__init__(*args, **kwargs)
        if questionnaire_SAID:
            self.fields['questionnaire_SAID'].initial = questionnaire_SAID

    class Meta:
        model = Negotiation
        fields = ['requestor_responses', 'questionnaire_SAID']  # Adjust as needed
