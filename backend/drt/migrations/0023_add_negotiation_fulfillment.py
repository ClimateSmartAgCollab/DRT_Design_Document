from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("drt", "0022_add_negotiation_clocks"),
    ]

    operations = [
        migrations.AddField(
            model_name="negotiation",
            name="fulfillment_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="negotiation",
            name="fulfillment_note",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="negotiation",
            name="fulfillment_status",
            field=models.CharField(
                choices=[
                    ("not_applicable", "Not applicable"),
                    ("pending", "Pending"),
                    ("delivered", "Delivered"),
                    ("withdrawn", "Withdrawn"),
                ],
                db_index=True,
                default="not_applicable",
                max_length=32,
            ),
        ),
    ]
