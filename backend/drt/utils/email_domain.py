"""Helpers for storing requestor identity as an email domain only."""


def email_to_domain(email):
    """Return the lowercased domain of an email, or None if it is not a mailbox.

    ``alice@Example.COM`` → ``example.com``
    ``not-an-email`` → ``None``
    """
    if not email or not isinstance(email, str):
        return None
    if "@" not in email:
        return None
    domain = email.rsplit("@", 1)[-1].strip().lower()
    return domain or None


def count_requestor_domains(emails):
    """Count requestors by email domain, skipping values that are not mailboxes."""
    counts = {}
    for email in emails:
        domain = email_to_domain(email)
        if domain is None:
            continue
        counts[domain] = counts.get(domain, 0) + 1
    return counts
