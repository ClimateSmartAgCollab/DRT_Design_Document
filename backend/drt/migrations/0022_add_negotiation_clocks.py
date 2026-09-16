from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('drt', '0021_delete_summarystatistic'),
    ]

    operations = [
        migrations.AddField(
            model_name='negotiation',
            name='abandoned_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='negotiation',
            name='decided_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='negotiation',
            name='first_owner_open_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='negotiation',
            name='reopen_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='negotiation',
            name='submitted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
