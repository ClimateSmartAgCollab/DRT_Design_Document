from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('drt', '0016_add_submission_version'),
    ]

    # visible_label column already exists in DB; update state only
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='nlink',
                    name='visible_label',
                    field=models.CharField(blank=True, db_index=True, default='', max_length=255),
                ),
            ],
            database_operations=[],
        ),
    ]
