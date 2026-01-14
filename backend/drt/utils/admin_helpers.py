"""
Admin helper utilities for environment-based admin authentication.
"""
import os
import logging

logger = logging.getLogger(__name__)


def get_admin_emails():
    """
    Get list of admin emails from environment variable.
    
    Reads ADMIN_EMAILS from environment, splits by comma, and returns
    a list of trimmed email addresses.
    
    Returns:
        list: List of admin email addresses, empty list if not configured.
    
    Example:
        ADMIN_EMAILS=admin1@example.com,admin2@example.com
        → ['admin1@example.com', 'admin2@example.com']
    """
    admin_emails_str = os.environ.get("ADMIN_EMAILS", "")
    
    if not admin_emails_str:
        logger.debug("ADMIN_EMAILS environment variable not set")
        return []
    
    # Split by comma, strip whitespace, filter empty strings
    emails = [
        email.strip()
        for email in admin_emails_str.split(",")
        if email.strip()
    ]
    
    logger.debug(f"Loaded {len(emails)} admin email(s) from environment")
    return emails


def is_admin_email(email):
    """
    Check if an email address is in the admin list.
    
    Args:
        email (str): Email address to check.
    
    Returns:
        bool: True if email is in admin list, False otherwise.
    
    Time Complexity: O(n) where n = number of admins (typically 1-5)
    In practice: O(1) because n is small and constant.
    """
    if not email:
        return False
    
    admin_emails = get_admin_emails()
    return email in admin_emails


def is_admin_enabled():
    """
    Check if admin functionality is enabled.
    
    Returns:
        bool: True if ADMIN_ENABLED is set to 'true', False otherwise.
    """
    enabled = os.environ.get("ADMIN_ENABLED", "false").lower() == "true"
    return enabled
