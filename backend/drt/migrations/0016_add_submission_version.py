from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('drt', '0015_add_reminder_sent_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='negotiation',
            name='submission_version',
            field=models.IntegerField(default=0),
        ),
    ]



