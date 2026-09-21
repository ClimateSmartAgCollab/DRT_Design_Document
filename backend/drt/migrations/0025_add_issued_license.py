from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("drt", "0024_nlink_tags_gin"),
    ]

    operations = [
        migrations.AddField(
            model_name="negotiation",
            name="issued_license_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="negotiation",
            name="issued_license_sha256",
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="negotiation",
            name="issued_license_text",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="negotiation",
            name="issued_license_version",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="negotiation",
            name="license_SAID",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
