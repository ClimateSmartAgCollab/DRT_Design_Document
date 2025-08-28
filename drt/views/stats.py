from django.urls import NoReverseMatch, reverse
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.db.models import F, Count, Q
from django.utils.translation import gettext_lazy as _
from ..models import NLink, Archive, SummaryStatistic, Negotiation
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from ..services.negotiation import delete_old_negotiations, handle_negotiation_archive_and_summary
from django.shortcuts import get_object_or_404
from .utils import owner_auth_required, requestor_auth_required
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
import json
import logging
from ..tasks import handle_negotiation_archive_and_summary_task
from drt.services.history import get_archive_history, map_archives_to_versions

logger = logging.getLogger(__name__)


def export_summary_to_drt_view(request):
    """
    HTTP GET → run the per-dataset export_summary_to_drt and return JSON status.
    """
    try:
        export_summary_to_drt()
        return JsonResponse({'message': 'Summary statistics exported successfully.'})
    except Exception as e:
        logger.error(
            f"Failed to export summary stats via HTTP: {e}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


def export_summary_to_drt():
    """
    Aggregate and store anonymized summary statistics per (owner, dataset_ID, data_label),
    and then break out per tag with correct, per-tag counts.
    """

    per_group_stats = (
        NLink.objects
        .values('owner_id', 'dataset_ID', 'data_label', 'record_label')
        .annotate(
            total_requests=Count('negotiation'),
            accepted_requests=Count('negotiation', filter=Q(
                negotiation__state='accepted')),
            rejected_requests=Count('negotiation',  filter=Q(
                negotiation__state='rejected')),
            requestor_open=Count('negotiation',    filter=Q(
                negotiation__state='requestor_open')),
            owner_open=Count('negotiation',        filter=Q(
                negotiation__state='owner_open')),
        )
    )
    logger.info(f"Found {per_group_stats.count()} owner/dataset/record_label groups")

    for grp in per_group_stats:
        owner_pk = grp['owner_id']
        ds_id = grp['dataset_ID']
        ds_label = grp['data_label']
        record_label = grp['record_label']

        nlink = NLink.objects.filter(
            owner_id=owner_pk,
            dataset_ID=ds_id,
            data_label=ds_label,
            record_label=record_label,
        ).first()
        if not nlink:
            logger.warning(
                f"No NLink found for owner={owner_pk!r}, dataset_ID={ds_id!r}, data_label={ds_label!r}, record_label={record_label!r}; skipping."
            )
            continue
        logger.info(
            f"Using NLink pk={nlink.pk} for {owner_pk!r}/{ds_id!r}/{ds_label!r}/{record_label!r}")

        domain_qs = (
            NLink.objects
            .filter(owner_id=owner_pk, dataset_ID=ds_id, data_label=ds_label, record_label=record_label)
            .values(domain=F('requestor_email'))
            .annotate(request_count=Count('negotiation'))
        )
        requestor_domains = {
            row['domain']: row['request_count']
            for row in domain_qs
        }

        overall_stat = {
            'total_requests':    grp['total_requests'],
            'accepted_requests': grp['accepted_requests'],
            'rejected_requests': grp['rejected_requests'],
            'requestor_open':    grp['requestor_open'],
            'owner_open':        grp['owner_open'],
            'requestor_domains': requestor_domains,
            'generated_at':      timezone.now().isoformat(),
        }
        datasets_list = [ds_id]

        SummaryStatistic.objects.update_or_create(
            owner_id=nlink,
            datasets_requested=datasets_list,
            data_label=ds_label,
            tag='',  # empty string = "no tag"
            record_label=record_label,
            defaults={'overall_stat': overall_stat, 'record_label': record_label},
        )
        logger.info(f"Upserted no‐tag summary for NLink pk={nlink.pk}")

        tags = set()
        for link in NLink.objects.filter(owner_id=owner_pk, dataset_ID=ds_id, data_label=ds_label, record_label=record_label):
            tags.update(link.tags)
        tags = sorted(tags)

        for t in tags:
            tag_stats = NLink.objects.filter(
                owner_id=owner_pk,
                dataset_ID=ds_id,
                data_label=ds_label,
                record_label=record_label,
                tags__contains=[t],
            ).aggregate(
                total_requests=Count('negotiation'),
                accepted_requests=Count('negotiation', filter=Q(
                    negotiation__state='accepted')),
                rejected_requests=Count('negotiation',  filter=Q(
                    negotiation__state='rejected')),
                requestor_open=Count('negotiation',    filter=Q(
                    negotiation__state='requestor_open')),
                owner_open=Count('negotiation',        filter=Q(
                    negotiation__state='owner_open')),
            )

            tag_stat_payload = {
                'total_requests':    tag_stats['total_requests'],
                'accepted_requests': tag_stats['accepted_requests'],
                'rejected_requests': tag_stats['rejected_requests'],
                'requestor_open':    tag_stats['requestor_open'],
                'owner_open':        tag_stats['owner_open'],
                'requestor_domains': requestor_domains,
                'generated_at':      timezone.now().isoformat(),
            }

            SummaryStatistic.objects.update_or_create(
                owner_id=nlink,
                datasets_requested=datasets_list,
                data_label=ds_label,
                tag=t,
                record_label=record_label,
                defaults={'overall_stat': tag_stat_payload, 'record_label': record_label},
            )
            logger.info(f"Upserted tag={t!r} summary for NLink pk={nlink.pk}")


def delete_old_negotiations_view(request):
    """Manually trigger the deletion of old negotiations."""
    return delete_old_negotiations()


@owner_auth_required
def owner_links_api(request):

    raw_owner_cache = cache.get("owner_table") or {}

    user_email = request.owner_email

    logger.debug(f"owner_links_api: user_email = {user_email}")

    owner_ids = [
        owner_id
        for owner_id, info in raw_owner_cache.items()
        if info.get("owner_email") == user_email
    ]

    # If no owner_id matches, return empty list
    if not owner_ids:
        logger.warning(
            f"No owner_id found for email {user_email}. Returning empty links list."
        )
        return JsonResponse({"links": []})

    logger.debug(f"owner_links_api: owner_ids = {owner_ids}")

    raw_link_cache = cache.get("link_table") or {}

    entries = []
    for link_url, row in raw_link_cache.items():
        if row.get("owner_id") in owner_ids:
            entries.append(
                {
                    "url": link_url,
                    "questionnaireId": row.get("questionnaire_id"),
                    "licenseId": row.get("license_id"),
                    "expiry": row.get("expiry") or "Never",
                    "label": row.get("data_label", ""),
                    "tags": row.get("tags", "(none)"),
                    "recordLabel": row.get("record_label", ""),
                }
            )

    return JsonResponse({"links": entries})


@owner_auth_required
def summary_statistics_view(request):
    """Endpoint for retrieving summary statistics based on the provided owner_id (string)."""

    email = request.owner_email

    cache_data = cache.get("owner_table") or {}

    if not email:
        return JsonResponse({'error': 'Email parameter is required'}, status=400)

    owner_ids = [
        owner_id
        for owner_id, info in cache_data.items()
        if info.get("owner_email") == email
    ]

    owner_id = owner_ids[0] if owner_ids else None

    try:
        stats_qs = SummaryStatistic.objects.filter(owner_id__owner_id=owner_id)
        if not stats_qs.exists():
            logger.warning(
                f"No SummaryStatistic found for owner_id={owner_id}")
            return JsonResponse({'error': 'No summary statistics found.'}, status=404)

        statistics_data = []
        for stat in stats_qs:

            stats_block = stat.overall_stat or {}
            statistics_data.append({
                'data_label':               stat.data_label,
                'tag':                     stat.tag or '',
                'record_label':            getattr(stat, 'record_label', ''),
                'total_requests':           stats_block.get('total_requests', 0),
                'accepted_requests':        stats_block.get('accepted_requests', 0),
                'rejected_requests':        stats_block.get('rejected_requests', 0),
                'requestor_open':           stats_block.get('requestor_open', 0),
                'owner_open':               stats_block.get('owner_open', 0),
                # 'average_response_time':    stats_block.get('average_response_time', 'N/A'),
                'generated_at':             stat.summary_date.isoformat(),
            })

        return JsonResponse({'summary_statistics': statistics_data})

    except ObjectDoesNotExist:
        return JsonResponse({'error': 'Owner statistics not found.'}, status=404)
    except Exception as e:
        logger.error(f"Error in summary_statistics_view: {e}")
        return JsonResponse({'error': 'Internal server error.'}, status=500)


def archive_negotiation(negotiation):
    """Archive the negotiation and save relevant data."""
    Archive.objects.create(
        negotiation=negotiation,
        archived_data={
            'requestor_responses': negotiation.requestor_responses,
            'owner_responses': negotiation.owner_responses,
            'comments': negotiation.comments,
            'state': negotiation.state,
        }
    )
    negotiation.archived = True
    negotiation.save()

    try:
        archive_url = reverse('archive_negotiation', kwargs={
                              'negotiation_id': negotiation.negotiation_id})
        return JsonResponse({'archive_url': archive_url})
    except NoReverseMatch as e:
        logger.error(
            f"Reverse URL error for negotiation {negotiation.negotiation_id}: {e}")
        return JsonResponse({'error': _('Invalid negotiation ID')}, status=400)


# Manually archive a negotiation
def archive_view(request, negotiation_id):
    """Manually archive a negotiation if it meets the required state."""
    negotiation = get_object_or_404(Negotiation, pk=negotiation_id)
    if negotiation.state in ['accepted', 'canceled', 'rejected']:
        return handle_negotiation_archive_and_summary(negotiation)
    else:
        return JsonResponse(
            {'message': _('Only accepted, canceled, or rejected negotiations can be archived')}, status=400
        )


@receiver(post_save, sender=Negotiation)
def generate_summary_statistics(sender, instance, **kwargs):
    """Generate summary statistics and archive negotiation upon state change."""
    if instance.state in ['accepted', 'canceled', 'rejected']:
        handle_negotiation_archive_and_summary_task.delay(instance.negotiation_id)


@receiver(post_save, sender=Negotiation)
def generate_summary_statistics_duplicate(sender, instance, **kwargs):
    """Auto-archive and export statistics when a negotiation is accepted, canceled, or rejected."""
    if instance.state in ['accepted', 'canceled', 'rejected'] and not instance.archived:
        handle_negotiation_archive_and_summary_task.delay(instance.negotiation_id)


def handle_negotiation_archive_and_summary_async(negotiation):
    """Archives the negotiation and exports summary statistics asynchronously."""
    try:
        with transaction.atomic():
            export_summary_to_drt()
            if not negotiation.archived:
                archive_negotiation(negotiation)
        logger.info(f"Successfully processed negotiation {negotiation.negotiation_id} asynchronously")
    except Exception as e:
        logger.error(f"Error processing negotiation {negotiation.negotiation_id} asynchronously: {e}")


def delete_negotiation_files(request, negotiation_id):
    """Delete a negotiation's files and corresponding archive."""
    negotiation = get_object_or_404(Negotiation, pk=negotiation_id)
    with transaction.atomic():
        archive = Archive.objects.filter(negotiation=negotiation).first()
        if archive:
            archive.delete()
        negotiation.delete()
    return JsonResponse({'message': _('Negotiation %(id)s deleted successfully') % {'id': negotiation_id}})


@requestor_auth_required
def negotiation_list_api_req(request):
    email = request.requestor_email
    if not email:
        return JsonResponse({'error': 'Email parameter is required'}, status=400)

    # only pull negotiations whose NLink.requestor_email matches
    qs = Negotiation.objects.select_related(
        'link').filter(link__requestor_email=email)

    data = []
    for n in qs:
        requestor_link = getattr(n, 'link', None)
        
        # Fetch questionnaire JSON like the owner side does
        questionnaire_json = None
        try:
            cache_key = f'questionnaire_json_{n.questionnaire_SAID}'
            cached_json = cache.get(cache_key)
            
            if cached_json:
                questionnaire_json = cached_json
            else:
                from datastore.views import fetch_questionnaire_json
                questionnaire_json = fetch_questionnaire_json(n.questionnaire_SAID)
        except Exception as e:
            print(f"Error fetching questionnaire for {n.questionnaire_SAID}: {e}")
            questionnaire_json = None
        
        data.append({
            'negotiation_id': str(n.negotiation_id),
            'conversation_id': str(n.conversation_id),
            'requestor_responses': n.requestor_responses,
            'owner_responses': n.owner_responses,
            'comments': n.comments,
            'state': n.state,
            # 'reminder_sent': n.reminder_sent,
            # 'questionnaire_SAID': n.questionnaire_SAID,
            'timestamps': n.timestamps.isoformat(),
            # 'archived': n.archived,
            'requestor_link': str(requestor_link.requestor_link) if requestor_link else None,
            'rationale': n.rationale,
            'questionnaire': questionnaire_json,  # Add questionnaire JSON
        })

    return JsonResponse(data, safe=False)


@owner_auth_required
def negotiation_list_api(request):

    email = request.owner_email

    cache_data = cache.get("owner_table") or {}

    if not email:
        return JsonResponse({'error': 'Email parameter is required'}, status=400)

    owner_ids = [
        owner_id
        for owner_id, info in cache_data.items()
        if info.get("owner_email") == email
    ]

    qs = Negotiation.objects.select_related('link') \
        .filter(link__owner_id__in=owner_ids)

    data = []
    for n in qs:
        link = getattr(n, 'link', None)
        
        questionnaire_json = None
        try:
            cache_key = f'questionnaire_json_{n.questionnaire_SAID}'
            cached_json = cache.get(cache_key)
            
            if cached_json:
                questionnaire_json = cached_json
            else:
                from datastore.views import fetch_questionnaire_json
                questionnaire_json = fetch_questionnaire_json(n.questionnaire_SAID)
        except Exception as e:
            print(f"Error fetching questionnaire for {n.questionnaire_SAID}: {e}")
            questionnaire_json = None
        
        data.append({
            'negotiation_id':     str(n.negotiation_id),
            'conversation_id':    str(n.conversation_id),
            'requestor_responses': n.requestor_responses,
            'owner_responses':    n.owner_responses,
            'comments':           n.comments,
            'state':              n.state,
            'reminder_sent':      n.reminder_sent,
            'questionnaire_SAID': n.questionnaire_SAID,
            'questionnaire':      questionnaire_json,  # Add questionnaire JSON
            'timestamps':         n.timestamps.isoformat(),
            'archived':           n.archived,
            'owner_link':         str(link.owner_link) if link else None,
            'rationale':          n.rationale,
            'tags': link.tags if link else [],
            'record_label': link.record_label if link else "",
        })

    return JsonResponse(data, safe=False)


# @api_view(['POST'])
# def cancel_request(request, link_id):
#     nlink = get_object_or_404(NLink, requestor_link=link_id)
#     negotiation = nlink.negotiation
#     negotiation.state = 'canceled'
#     negotiation.save()

#     send_mail(
#         'Request Canceled',
#         'The requestor has canceled the data request.',
#         'noreply@dart-system.com',
#         [nlink.owner_id]
#     )
#     return JsonResponse({'message': 'Request canceled successfully!'})

@csrf_exempt
def submission_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed."}, status=405)

    submission = json.loads(request.body)
    fmt = request.GET.get("format", "json").lower()
    license_id = request.GET.get("license_id", "l-001-test")  # Get license_id from query params

    if fmt == "license":
        print(f"📄 rendering license template from GitHub for license_id: {license_id}")
        # Get license template from cache or fetch from GitHub
        cache_key = f'license_template_{license_id}'
        license_template_content = cache.get(cache_key)
        if not license_template_content:
            from datastore.views import fetch_license_template
            license_template_content = fetch_license_template(license_id)
        
        if license_template_content:
            # Create template from string content and render it as human-readable text
            from jinja2 import Template
            template = Template(license_template_content)
            content_type = "text/plain"
            filename = "license.txt"
            owner_table = cache.get("owner_table")
            
            # Import the flatten function from license service
            from drt.services.license import flatten_form_data
            details = flatten_form_data(submission)
            
            context = {"submission": details, "owner_table": owner_table}
            rendered = template.render(**context)
        else:
            # Fallback to hardcoded template if GitHub fetch fails
            print(f"⚠️ License template not found for {license_id}, using fallback template")
            from jinja2 import Environment, FileSystemLoader, select_autoescape
            env = Environment(
                loader=FileSystemLoader("drt/templates"),
                autoescape=select_autoescape(["html", "xml", "json"])
            )
            template = env.get_template("license_template_fallback.jinja")
            content_type = "text/plain"
            filename = "license.txt"
            owner_table = cache.get("owner_table")
            
            # Import the flatten function from license service
            from drt.services.license import flatten_form_data
            details = flatten_form_data(submission)
            
            context = {"submission": details, "owner_table": owner_table}
            rendered = template.render(**context)

    # elif fmt == "odrl":
    #     print("📃 rendering license_odrl.xml.jinja")
    #     template = env.get_template("license_odrl.xml.jinja")
    #     content_type = "application/xml"
    #     filename = "license.xml"
    #     context = {"submission": submission}

    # else:
    #     print("🔧 rendering catalog_response.jinja")
    #     template = env.get_template("catalog_response.jinja")
    #     content_type = "application/json"
    #     filename = "standardized_openAIRE.json"
    #     context = {"submission": submission}

    response = HttpResponse(rendered, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@owner_auth_required
def regenerate_license_view(request, negotiation_id):
    """Regenerate license for a specific negotiation and return it for download"""
    try:
        from drt.models import Negotiation, NLink
        from drt.services.license import flatten_form_data
        
        negotiation = get_object_or_404(Negotiation, negotiation_id=negotiation_id)
        nlink = get_object_or_404(NLink, negotiation=negotiation)
        
        owner_table = cache.get("owner_table", {})
        owner_email = owner_table.get(nlink.owner_id, {}).get("owner_email")
        
        if not owner_email or owner_email != request.owner_email:
            return JsonResponse({"error": "Unauthorized access to this negotiation"}, status=403)
        
        submission = negotiation.requestor_responses
        if not submission:
            return JsonResponse({"error": "No requestor responses found for this negotiation"}, status=400)
        
        details = flatten_form_data(submission)
        
        license_id = getattr(nlink, 'license_id', None) or 'l-001-test'
        cache_key = f'license_template_{license_id}'
        license_template_content = cache.get(cache_key)
        
        if not license_template_content:
            from datastore.views import fetch_license_template
            license_template_content = fetch_license_template(license_id)
            
        if license_template_content:
            from jinja2 import Template
            template = Template(license_template_content)
            rendered = template.render(submission=details, owner_table=owner_table)
        else:
            from jinja2 import Environment, FileSystemLoader, select_autoescape
            env = Environment(
                loader=FileSystemLoader("drt/templates"),
                autoescape=select_autoescape(['html', 'xml', 'json'])
            )
            template = env.get_template("license_template_fallback.jinja")
            rendered = template.render(submission=details, owner_table=owner_table)
        
        response = HttpResponse(rendered, content_type="text/plain")
        response["Content-Disposition"] = f'attachment; filename="license_{negotiation_id}.txt"'
        return response
        
    except Exception as e:
        logger.error(f"Error regenerating license for negotiation {negotiation_id}: {str(e)}")
        return JsonResponse({"error": "Failed to regenerate license"}, status=500)


@owner_auth_required
def negotiation_history_view(request, negotiation_id):
    """Fetch negotiation history using Archive snapshots."""
    try:
        from drt.models import Negotiation
        negotiation = get_object_or_404(Negotiation, negotiation_id=negotiation_id)

        # Questionnaire JSON for labels
        questionnaire_json = None
        try:
            cache_key = f'questionnaire_json_{negotiation.questionnaire_SAID}'
            cached_json = cache.get(cache_key)
            if cached_json:
                questionnaire_json = cached_json
            else:
                from datastore.views import fetch_questionnaire_json
                questionnaire_json = fetch_questionnaire_json(negotiation.questionnaire_SAID)
        except Exception as e:
            logger.error(f"Error fetching questionnaire for {negotiation.questionnaire_SAID}: {e}")
            questionnaire_json = None

        # Build version_history from Archive
        archives = get_archive_history(negotiation)
        version_history = map_archives_to_versions(archives)

        response_data = {
            'negotiation_id': str(negotiation.negotiation_id),
            'conversation_id': str(negotiation.conversation_id),
            'state': negotiation.state,
            'timestamps': negotiation.timestamps.isoformat(),
            'requestor_responses': negotiation.requestor_responses,
            'owner_responses': negotiation.owner_responses,
            'comments': negotiation.comments,
            'rationale': negotiation.rationale,
            'questionnaire': questionnaire_json,
            'commentCycles': [],  # superseded by version_history
            'version_history': version_history,
            'is_legacy': False,
        }

        return JsonResponse(response_data)

    except Exception as e:
        logger.error(f"Error fetching history for negotiation {negotiation_id}: {str(e)}")
        return JsonResponse({"error": "Failed to fetch negotiation history"}, status=500)
