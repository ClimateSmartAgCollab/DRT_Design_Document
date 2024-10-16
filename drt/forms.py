# forms.py
from django import forms
from .models import Requestor, Questionnaire

class RequestorEmailForm(forms.Form):
    email = forms.EmailField(label='Enter your email', required=True)

class QuestionnaireForm(forms.ModelForm):
    class Meta:
        model = Questionnaire
        fields = ['schema']  # Use schema to display the dynamic form.
