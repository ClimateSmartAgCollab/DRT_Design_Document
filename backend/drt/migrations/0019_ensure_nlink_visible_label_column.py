from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("drt", "0018_alter_summarystatistic_options_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE drt_nlink
                ADD COLUMN IF NOT EXISTS visible_label varchar(255) NOT NULL DEFAULT '';
            """,
            reverse_sql="""
                ALTER TABLE drt_nlink
                DROP COLUMN IF EXISTS visible_label;
            """,
        ),
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS drt_nlink_visible_label_7909fdf6
                ON drt_nlink (visible_label);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS drt_nlink_visible_label_7909fdf6;
            """,
        ),
    ]
