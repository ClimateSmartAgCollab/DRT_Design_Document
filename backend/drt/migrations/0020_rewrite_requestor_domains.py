from django.db import migrations


def email_to_domain(email):
    """Inline copy — migrations must not import app code."""
    if not email or not isinstance(email, str):
        return None
    if "@" not in email:
        return None
    domain = email.rsplit("@", 1)[-1].strip().lower()
    return domain or None


def rewrite_requestor_domains(apps, schema_editor):
    SummaryStatistic = apps.get_model("drt", "SummaryStatistic")
    for row in SummaryStatistic.objects.iterator():
        overall = row.overall_stat
        if not isinstance(overall, dict):
            continue
        domains = overall.get("requestor_domains")
        if not isinstance(domains, dict):
            continue
        rewritten = {}
        for key, count in domains.items():
            domain = email_to_domain(key)
            if domain is None:
                # Already a domain (no @) from a prior rewrite — keep it.
                if isinstance(key, str) and key.strip():
                    domain = key.strip().lower()
                else:
                    continue
            try:
                n = int(count or 0)
            except (TypeError, ValueError):
                continue
            rewritten[domain] = rewritten.get(domain, 0) + n
        if rewritten != domains:
            overall = dict(overall)
            overall["requestor_domains"] = rewritten
            row.overall_stat = overall
            row.save(update_fields=["overall_stat"])


class Migration(migrations.Migration):
    dependencies = [
        ("drt", "0019_ensure_nlink_visible_label_column"),
    ]
    operations = [
        migrations.RunPython(
            rewrite_requestor_domains,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
