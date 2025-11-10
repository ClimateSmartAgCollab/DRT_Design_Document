# Generated manually to add abandoned state
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('drt', '0012_alter_archive_options_archive_change_description_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='negotiation',
            name='state',
            field=models.CharField(choices=[
                ('requestor_open', 'Requestor Open'), 
                ('owner_open', 'Owner Open'), 
                ('accepted', 'Accepted'), 
                ('archived', 'Archived'), 
                ('canceled', 'Canceled'), 
                ('rejected', 'Rejected'),
                ('abandoned', 'Abandoned')
            ], default='requestor_open', max_length=50),
        ),
    ]

