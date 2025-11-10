# Generated manually to add reminder_sent_date field
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('drt', '0014_alter_archive_state'),
    ]

    operations = [
        migrations.AddField(
            model_name='negotiation',
            name='reminder_sent_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

