from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("drt", "0020_rewrite_requestor_domains"),
    ]

    operations = [
        migrations.DeleteModel(
            name="SummaryStatistic",
        ),
    ]
