"""
Email helper utilities for consistent email formatting and content generation.
"""
from django.conf import settings
from typing import Dict, Any, Optional


def get_email_base_html(title: str, content: str, cta_button: Optional[Dict[str, str]] = None, 
                       secondary_buttons: Optional[list] = None, alert_box: Optional[Dict[str, str]] = None,
                       warning_box: Optional[Dict[str, str]] = None, success_box: Optional[Dict[str, str]] = None,
                       info_box: Optional[Dict[str, str]] = None, expiry_info: Optional[str] = None,
                       link_display: Optional[str] = None) -> str:

    main_content = f"""
    <h2>{title}</h2>
    {content}
    """
    
    if expiry_info:
        main_content += f"""
        <div class="expiry-info">
            <p>{expiry_info}</p>
        </div>
        """
    
    if link_display:
        main_content += f"""
        <div class="link-display">
            {link_display}
        </div>
        """
    
    if info_box:
        main_content += f"""
        <div class="info-box">
            <h3>{info_box['title']}</h3>
            <p>{info_box['content']}</p>
        </div>
        """
    
    if alert_box:
        main_content += f"""
        <div class="alert-box">
            <h3>{alert_box['title']}</h3>
            <p>{alert_box['content']}</p>
        </div>
        """
    
    if warning_box:
        main_content += f"""
        <div class="warning-box">
            <h3>{warning_box['title']}</h3>
            <p>{warning_box['content']}</p>
        </div>
        """
    
    if success_box:
        main_content += f"""
        <div class="success-box">
            <h3>{success_box['title']}</h3>
            <p>{success_box['content']}</p>
        </div>
        """
    
    # Add call-to-action button
    if cta_button:
        main_content += f"""
        <p style="text-align: center; margin: 30px 0;">
            <a href="{cta_button['url']}" class="cta-button" target="_blank">{cta_button['text']}</a>
        </p>
        """
    
    # Add secondary buttons
    if secondary_buttons:
        buttons_html = ""
        for button in secondary_buttons:
            buttons_html += f'<a href="{button["url"]}" class="secondary-button" target="_blank">{button["text"]}</a>'
        main_content += f"""
        <p style="text-align: center; margin: 20px 0;">
            {buttons_html}
        </p>
        """
    
    # Return the complete HTML email with base template structure
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
        }}
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }}
        .email-header {{
            background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
        }}
        .email-header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .email-body {{
            padding: 40px;
        }}
        .email-body h2 {{
            color: #0066cc;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 20px;
        }}
        .email-body p {{
            margin-bottom: 16px;
            font-size: 16px;
        }}
        .info-box {{
            background-color: #f8f9fa;
            border-left: 4px solid #0066cc;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }}
        .info-box h3 {{
            margin: 0 0 10px 0;
            color: #0066cc;
            font-size: 16px;
        }}
        .info-box p {{
            margin: 8px 0;
        }}
        .cta-button {{
            display: inline-block;
            background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            transition: all 0.3s ease;
        }}
        .cta-button:hover {{
            background: linear-gradient(135deg, #0052a3 0%, #003d7a 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
        }}
        .secondary-button {{
            display: inline-block;
            background-color: #6c757d;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            margin: 10px 10px 10px 0;
        }}
        .secondary-button:hover {{
            background-color: #5a6268;
        }}
        .alert-box {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }}
        .alert-box h3 {{
            margin: 0 0 8px 0;
            color: #856404;
            font-size: 16px;
        }}
        .alert-box p {{
            margin: 4px 0;
            color: #856404;
        }}
        .warning-box {{
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }}
        .warning-box h3 {{
            margin: 0 0 8px 0;
            color: #721c24;
            font-size: 16px;
        }}
        .warning-box p {{
            margin: 4px 0;
            color: #721c24;
        }}
        .success-box {{
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }}
        .success-box h3 {{
            margin: 0 0 8px 0;
            color: #155724;
            font-size: 16px;
        }}
        .success-box p {{
            margin: 4px 0;
            color: #155724;
        }}
        .email-footer {{
            background-color: #f8f9fa;
            padding: 30px 40px;
            border-top: 1px solid #e9ecef;
            text-align: center;
        }}
        .email-footer p {{
            margin: 8px 0;
            color: #6c757d;
            font-size: 14px;
        }}
        .email-footer a {{
            color: #0066cc;
            text-decoration: none;
        }}
        .email-footer a:hover {{
            text-decoration: underline;
        }}
        .divider {{
            height: 1px;
            background-color: #e9ecef;
            margin: 30px 0;
        }}
        .expiry-info {{
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 12px;
            border-radius: 4px;
            margin: 16px 0;
            text-align: center;
        }}
        .expiry-info p {{
            margin: 0;
            color: #856404;
            font-weight: 500;
        }}
        .link-display {{
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 12px;
            border-radius: 4px;
            margin: 16px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
        }}
        @media (max-width: 600px) {{
            .email-container {{
                margin: 0;
                box-shadow: none;
            }}
            .email-header,
            .email-body,
            .email-footer {{
                padding: 20px;
            }}
            .cta-button,
            .secondary-button {{
                display: block;
                text-align: center;
                margin: 10px 0;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>{title}</h1>
        </div>
        
        <div class="email-body">
            {main_content}
        </div>
        
        <div class="divider"></div>
        
        <div class="email-footer">
            <p><strong>The DRT System</strong></p>
            <p>Data Request Tracker Platform</p>
            <p>If you have any questions or need assistance, please contact our support team at <a href="mailto:adc@uoguelph.ca">adc@uoguelph.ca</a></p>
            <p><em>This is an automated message. Please do not reply to this email.</em></p>
        </div>
    </div>
</body>
</html>
    """


def get_verification_email_html(magic_link: str, expiry: str, recipient_type: str = "user") -> str:
    """Generate HTML for verification emails."""
    title = "Email Verification Required"
    content = f"""
    <p>Hello,</p>
    <p>Please click the button below to verify your email address and access your account:</p>
    """
    
    cta_button = {
        'text': 'Verify Email Address',
        'url': magic_link
    }
    
    expiry_info = f"This verification link will expire at {expiry}."
    
    warning_box = {
        'title': 'Security Notice',
        'content': 'For your security, please do not share this link with anyone. If you did not request this verification, simply ignore this message.'
    }
    
    return get_email_base_html(title, content, cta_button=cta_button, expiry_info=expiry_info, warning_box=warning_box)


def get_notification_email_html(email_type: str, dataset_name: str, requestor_email: str = None, 
                               owner_email: str = None, magic_link: str = None, expiry: str = None,
                               dashboard_url: str = None, is_new_request: bool = True) -> str:
    """Generate HTML for notification emails."""
    if email_type == "owner_new_request" or email_type == "owner_updated_request":
        title = "New Data Access Request - Action Required" if is_new_request else "Updated Data Access Request - Action Required"
        content = f"""
        <p>Hello,</p>
        <p>{"A new data access request has been submitted for your dataset." if is_new_request else "The requestor has updated their access request based on your feedback."}</p>
        """
        
        info_box = {
            'title': 'Request Details',
            'content': f'<strong>Requestor:</strong> {requestor_email}<br><strong>Dataset:</strong> {dataset_name}'
        }
        
        if magic_link:
            cta_button = {
                'text': 'Review Request',
                'url': magic_link
            }
        
        if expiry:
            expiry_info = f"This review link will expire on {expiry} UTC."
        
        secondary_buttons = []
        if dashboard_url:
            secondary_buttons.append({
                'text': 'Access Dashboard',
                'url': dashboard_url
            })
        
        return get_email_base_html(title, content, cta_button=cta_button, secondary_buttons=secondary_buttons,
                                 info_box=info_box, expiry_info=expiry_info)
    
    elif email_type == "requestor_confirmation":
        title = "Data Access Request Submitted Successfully" if is_new_request else "Data Access Request Updated Successfully"
        content = f"""
        <p>Hello,</p>
        <p>{"Your data access request has been submitted successfully." if is_new_request else "Your data access request has been updated successfully."}</p>
        <p>We will notify you once the owner reviews your request.</p>
        """
        
        info_box = {
            'title': 'Request Details',
            'content': f'<strong>Dataset:</strong> {dataset_name}'
        }
        
        secondary_buttons = []
        if dashboard_url:
            secondary_buttons.append({
                'text': 'Access Dashboard',
                'url': dashboard_url
            })
        
        return get_email_base_html(title, content, secondary_buttons=secondary_buttons, info_box=info_box)


def get_rejection_email_html(dataset_name: str, rationale: str, dashboard_url: str, 
                           questionnaire_url: str = None, record_label: str = None) -> str:
    """Generate HTML for rejection emails."""
    title = "Data Access Request Rejected"
    content = """
    <p>Hello,</p>
    <p>We regret to inform you that your data access request has been rejected.</p>
    """
    
    # Build request details with available information
    request_details = ""
    if record_label:
        request_details = f'<strong>Dataset:</strong> {record_label}'
    
    info_box = None
    if request_details:
        info_box = {
            'title': 'Request Details',
            'content': request_details
        }
    
    warning_box = {
        'title': 'Rejection Reason',
        'content': rationale
    }
    
    alert_box = {
        'title': 'Next Steps',
        'content': 'You can review the rejection reason above and consider submitting a new request with additional information or clarification if needed.'
    }
    
    # Create buttons - prioritize direct questionnaire link if available
    buttons = []
    buttons.append({
        'text': 'Access Dashboard',
        'url': dashboard_url
    })
    
    return get_email_base_html(title, content, secondary_buttons=buttons, 
                             warning_box=warning_box, alert_box=alert_box, info_box=info_box)


def get_clarification_email_html(dataset_name: str, clarification_url: str) -> str:
    """Generate HTML for clarification emails."""
    title = "Data Access Request - Clarification Required"
    content = """
    <p>Hello,</p>
    <p>We need more information to proceed with your request.</p>
    <p>Please complete the necessary details by clicking the button below:</p>
    """
    
    cta_button = {
        'text': 'Complete Questionnaire',
        'url': clarification_url
    }
    
    
    alert_box = {
        'title': 'Action Required',
        'content': 'Please provide the additional information as soon as possible to avoid delays in processing your request.'
    }
    
    return get_email_base_html(title, content, cta_button=cta_button, alert_box=alert_box)


def get_reopen_email_html(dataset_name: str, previous_state: str, dashboard_url: str, 
                         questionnaire_url: str = None, record_label: str = None) -> str:
    """Generate HTML for reopen notification emails."""
    title = "Data Access Request Reopened"
    content = """
    <p>Hello,</p>
    <p>Your data access request has been reopened by the data owner.</p>
    """
    
    request_details = f'<strong>Previous Status:</strong> {previous_state}'
    if record_label:
        request_details += f'<br><strong>Dataset:</strong> {record_label}'
    
    info_box = {
        'title': 'Request Details',
        'content': request_details
    }
    
    success_box = {
        'title': 'Request Reopened',
        'content': 'You can now continue with your request. Use the button below to access your specific questionnaire, or visit your dashboard to see all requests.'
    }
    
    buttons = []
    # if questionnaire_url:
    #     buttons.append({
    #         'text': 'Continue This Request',
    #         'url': questionnaire_url
    #     })
    buttons.append({
        'text': 'Access Dashboard',
        'url': dashboard_url
    })
    
    return get_email_base_html(title, content, secondary_buttons=buttons, 
                             info_box=info_box, success_box=success_box)


def get_abandonment_reminder_html(dataset_name: str, recipient_type: str, dashboard_url: str) -> str:
    """Generate HTML for abandonment reminder emails."""
    if recipient_type == 'requestor':
        title = "Data Access Request - Action Required"
        content = """
        <p>Hello,</p>
        <p>We noticed that your data access request has been inactive for over 30 days.</p>
        <p>To keep your request active, please complete your questionnaire or take action by accessing your dashboard.</p>
        """
    else:  # owner
        title = "Data Access Request Review - Action Required"
        content = """
        <p>Hello,</p>
        <p>We noticed that a data access request has been waiting for your review for over 30 days.</p>
        <p>To keep this request active, please review and respond to the request by accessing your review page.</p>
        """
    
    info_box = {
        'title': 'Request Details',
        'content': f'<strong>Dataset:</strong> {dataset_name}'
    }
    
    warning_box = {
        'title': 'Important Notice',
        'content': 'You have 3 days to take action. If no action is taken within this period, the request will be automatically marked as abandoned.'
    }
    
    secondary_buttons = [{
        'text': 'Take Action Now',
        'url': dashboard_url
    }]
    
    return get_email_base_html(title, content, secondary_buttons=secondary_buttons, 
                             info_box=info_box, warning_box=warning_box)


def get_abandonment_notification_html(dataset_name: str, questionnaire_url: str, dashboard_url: str) -> str:
    """Generate HTML for abandonment notification emails."""
    title = "Data Access Request - Abandoned"
    content = """
    <p>Hello,</p>
    <p>Your data access request has been automatically marked as abandoned due to inactivity.</p>
    """
    
    info_box = {
        'title': 'Request Details',
        'content': f'<strong>Dataset:</strong> {dataset_name}<br><strong>Reason:</strong> No activity was detected for over 33 days (30 days initial + 3 days grace period).'
    }
    
    alert_box = {
        'title': 'Still Need Access?',
        'content': 'You can continue with this request or access your dashboard to manage all requests.'
    }
    
    secondary_buttons = [
        {
            'text': 'Continue This Request',
            'url': questionnaire_url
        },
        {
            'text': 'Access Dashboard',
            'url': dashboard_url
        }
    ]
    
    return get_email_base_html(title, content, secondary_buttons=secondary_buttons, 
                             info_box=info_box, alert_box=alert_box)


def get_magic_link_resend_html(magic_link: str) -> str:
    """Generate HTML for magic link resend emails."""
    title = "Access Link Resent"
    content = """
    <p>Hello,</p>
    <p>Here is your access link again:</p>
    """
    
    link_display = f'<a href="{magic_link}" target="_blank">{magic_link}</a>'
    
    return get_email_base_html(title, content, link_display=link_display)


def get_license_email_html(record_label: str, data_label: str, tags: str, requestor_email: str, dashboard_url: str) -> str:
    """Generate HTML for license agreement emails."""
    title = f"License Agreement for Record – {record_label}"
    content = """
    <p>Hello,</p>
    <p>Please find attached the license agreement documents related to the dataset for your review and negotiation.</p>
    <p>Below are the key details regarding this license request:</p>
    """
    
    info_box = {
        'title': 'License Request Details',
        'content': f'<strong>Data Label:</strong> {data_label}<br><strong>Tags:</strong> {tags}<br><strong>Record Label:</strong> {record_label}<br><strong>Requestor Email:</strong> {requestor_email}'
    }
    
    alert_box = {
        'title': 'Action Required',
        'content': 'Please review the attached documents at your earliest convenience. If you have any questions or require clarification, do not hesitate to contact us.'
    }
    
    secondary_buttons = [{
        'text': 'Access Dashboard',
        'url': dashboard_url
    }]
    
    return get_email_base_html(title, content, secondary_buttons=secondary_buttons, 
                             info_box=info_box, alert_box=alert_box)


def get_plain_text_email(content: str) -> str:
    """Generate plain text version of email content."""
    # Basic HTML to plain text conversion
    import re
    
    # Remove HTML tags
    plain_text = re.sub(r'<[^>]+>', '', content)
    
    # Clean up whitespace
    plain_text = re.sub(r'\n\s*\n', '\n\n', plain_text)
    plain_text = plain_text.strip()
    
    return plain_text
