# drt/migrations/0004_require_owner_id.py
from django.db import migrations, models

def delete_null_owner_rows(apps, schema_editor):
    NLink = apps.get_model('drt', 'NLink')
    # Delete rows that have no owner_id at all
    NLink.objects.filter(owner_id__isnull=True).delete()
    NLink.objects.filter(owner_id='').delete()

class Migration(migrations.Migration):
    dependencies = [
        ('drt', '0003_alter_summarystatistic_owner_id'),
    ]
    operations = [
        # 1) delete any bad rows
        migrations.RunPython(delete_null_owner_rows, reverse_code=migrations.RunPython.noop),
        # 2) now alter the field to be required
        migrations.AlterField(
            model_name='nlink',
            name='owner_id',
            field=models.CharField(max_length=255),
        ),
    ]
