from django.urls import NoReverseMatch, reverse
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.db.models import F, Count, Q, Min, Max
from django.utils.translation import gettext_lazy as _
from django.utils.dateparse import parse_datetime, parse_date
from ..models import NLink, Archive, SummaryStatistic, Negotiation
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from ..services.negotiation import delete_old_negotiations, handle_negotiation_archive_and_summary, process_abandonment_policy, abandon_negotiation_by_requestor
from django.shortcuts import get_object_or_404
from .utils import owner_auth_required, requestor_auth_required
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
import json
import logging
import datetime
from ..tasks import handle_negotiation_archive_and_summary_task, send_reopen_notification_email_task
from drt.services.history import get_archive_history, map_archives_to_versions
from datastore.views import fetch_questionnaire_json, fetch_license_template
from jinja2 import Template, Environment, FileSystemLoader, select_autoescape
from drt.services.license import flatten_form_data        
from .questionnaire import create_archive_snapshot


logger = logging.getLogger(__name__)


def export_summary_to_drt_view(_request):
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


def export_summary_to_drt(owner_id=None):
    """
    Aggregate and store anonymized summary statistics per (owner, dataset_ID, data_label),
    and then break out per tag with correct, per-tag counts.
    """
    # Filter by owner_id if provided, otherwise process all owners
    if owner_id:
        nlink_filter = Q(owner_id=owner_id)
        logger.info(f"Generating summary statistics for owner_id={owner_id}")
    else:
        nlink_filter = Q()
        logger.info("Generating summary statistics for all owners")

    per_group_stats = (
        NLink.objects
        .filter(nlink_filter)
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

        date_range = NLink.objects.filter(
            owner_id=owner_pk, 
            dataset_ID=ds_id, 
            data_label=ds_label, 
            record_label=record_label
        ).aggregate(
            min_date=Min('negotiation__timestamps'),
            max_date=Max('negotiation__timestamps'),
            last_activity=Max('last_activity')
        )

        overall_stat = {
            'total_requests':    grp['total_requests'],
            'accepted_requests': grp['accepted_requests'],
            'rejected_requests': grp['rejected_requests'],
            'requestor_open':    grp['requestor_open'],
            'owner_open':        grp['owner_open'],
            'requestor_domains': requestor_domains,
            'generated_at':      timezone.now().isoformat(),
            'negotiation_date_range': {
                'min_date': date_range['min_date'].isoformat() if date_range['min_date'] else None,
                'max_date': date_range['max_date'].isoformat() if date_range['max_date'] else None,
            },
            'last_activity': date_range['last_activity'].isoformat() if date_range['last_activity'] else None,
        }
        datasets_list = [ds_id]

        SummaryStatistic.objects.update_or_create(
            owner_id=nlink,
            datasets_requested=datasets_list,
            data_label=ds_label,
            tag='',  # empty string = "no tag", all tags combined
            record_label=record_label,
            defaults={'overall_stat': overall_stat, 'record_label': record_label},
        )
        logger.info(f"Upserted no‐tag summary for NLink pk={nlink.pk}")

        tags = set()
        for link in NLink.objects.filter(owner_id=owner_pk, dataset_ID=ds_id, data_label=ds_label, record_label=record_label):
            tags.update(link.tags)
        tags = sorted(tags)

        for t in tags:
            tag_filter = Q(owner_id=owner_pk, dataset_ID=ds_id, data_label=ds_label, record_label=record_label, tags__contains=[t])
            
            tag_stats = NLink.objects.filter(tag_filter).aggregate(
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
            
            # Calculate date range and latest activity for this tag
            tag_date_range = NLink.objects.filter(tag_filter).aggregate(
                min_date=Min('negotiation__timestamps'),
                max_date=Max('negotiation__timestamps'),
                last_activity=Max('last_activity')
            )

            tag_stat_payload = {
                'total_requests':    tag_stats['total_requests'],
                'accepted_requests': tag_stats['accepted_requests'],
                'rejected_requests': tag_stats['rejected_requests'],
                'requestor_open':    tag_stats['requestor_open'],
                'owner_open':        tag_stats['owner_open'],
                'requestor_domains': requestor_domains,
                'generated_at':      timezone.now().isoformat(),
                'negotiation_date_range': {
                    'min_date': tag_date_range['min_date'].isoformat() if tag_date_range['min_date'] else None,
                    'max_date': tag_date_range['max_date'].isoformat() if tag_date_range['max_date'] else None,
                },
                'last_activity': tag_date_range['last_activity'].isoformat() if tag_date_range['last_activity'] else None,
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
    """ Endpoint for retrieving summary statistics with optional tag filtering."""

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

    # Get filter parameters
    tags_filter = request.GET.getlist("tags")  # Multiple tags = AND logic
    data_label_filter = request.GET.get("data_label")
    record_label_filter = request.GET.getlist("record_label")
    include_all_tags = request.GET.get("include_all_tags", "false").lower() == "true"
    
    # Get date filter parameters (for negotiation dates)
    start_date = request.GET.get("startDate")
    end_date = request.GET.get("endDate")
    
    has_date_filter = bool(start_date or end_date)
    has_tag_filter = bool(tags_filter)
    
    use_direct_query = has_date_filter or has_tag_filter

    try:
        if include_all_tags:
            stats_qs = SummaryStatistic.objects.filter(owner_id__owner_id=owner_id)
            
            if not stats_qs.exists():
                logger.warning(
                    f"No SummaryStatistic found for owner_id={owner_id}")
                return JsonResponse({'error': 'No summary statistics found.'}, status=404)

            statistics_data = []
            for stat in stats_qs:
                stats_block = stat.overall_stat or {}
                date_range = stats_block.get('negotiation_date_range', {})
                last_activity = stats_block.get('last_activity')
                statistics_data.append({
                    'data_label': stat.data_label,
                    'tag': stat.tag or '',
                    'record_label': getattr(stat, 'record_label', ''),
                    'total_requests': stats_block.get('total_requests', 0),
                    'accepted_requests': stats_block.get('accepted_requests', 0),
                    'rejected_requests': stats_block.get('rejected_requests', 0),
                    'requestor_open': stats_block.get('requestor_open', 0),
                    'owner_open': stats_block.get('owner_open', 0),
                    'generated_at': stat.summary_date.isoformat(),
                    'last_updated': stat.summary_date.isoformat(),
                    'last_activity': last_activity,  
                    'negotiation_date_range': date_range,
                })

            return JsonResponse({'summary_statistics': statistics_data})
        
        if use_direct_query:
            nlink_filter = Q(owner_id=owner_id)
            
            if tags_filter:
                tags_filter_cleaned = [tag.strip() for tag in tags_filter]
                for tag in tags_filter_cleaned:
                    tag_q = Q(tags__contains=[tag]) | Q(tags__contains=[f' {tag}']) | Q(tags__contains=[f'{tag} ']) | Q(tags__contains=[f' {tag} '])
                    nlink_filter = nlink_filter & tag_q
            
            if data_label_filter:
                nlink_filter &= Q(data_label=data_label_filter)
            
            if record_label_filter:
                nlink_filter &= Q(record_label__in=record_label_filter)
            
            # Apply date filters on negotiation timestamps 
            if start_date:
                try:
                    start_dt = parse_datetime(start_date)
                    if not start_dt:
                        start_date_obj = parse_date(start_date)
                        if start_date_obj:
                            start_dt = timezone.make_aware(
                                datetime.datetime.combine(start_date_obj, datetime.time.min)
                            )
                    if start_dt:
                        nlink_filter &= Q(negotiation__timestamps__gte=start_dt)
                except (ValueError, TypeError):
                    pass

            if end_date:
                try:
                    end_dt = parse_datetime(end_date)
                    if not end_dt:
                        end_date_obj = parse_date(end_date)
                        if end_date_obj:
                            end_dt = timezone.make_aware(
                                datetime.datetime.combine(end_date_obj, datetime.time.max)
                            )
                    if end_dt:
                        nlink_filter &= Q(negotiation__timestamps__lte=end_dt)
                except (ValueError, TypeError):
                    pass
            
            if data_label_filter and record_label_filter and len(record_label_filter) == 1:
                stats = NLink.objects.filter(nlink_filter).aggregate(
                    total_requests=Count('negotiation'),
                    accepted_requests=Count('negotiation', filter=Q(negotiation__state='accepted')),
                    rejected_requests=Count('negotiation', filter=Q(negotiation__state='rejected')),
                    requestor_open=Count('negotiation', filter=Q(negotiation__state='requestor_open')),
                    owner_open=Count('negotiation', filter=Q(negotiation__state='owner_open')),
                )
                
                # Calculate actual date range and latest activity of filtered negotiations
                date_range = NLink.objects.filter(nlink_filter).aggregate(
                    min_date=Min('negotiation__timestamps'),
                    max_date=Max('negotiation__timestamps'),
                    last_activity=Max('last_activity')
                )
                
                statistics_data = [{
                    'data_label': data_label_filter,
                    'tag': ', '.join(sorted(tags_filter_cleaned)) if tags_filter else '',
                    'record_label': record_label_filter[0],
                    'total_requests': stats['total_requests'],
                    'accepted_requests': stats['accepted_requests'],
                    'rejected_requests': stats['rejected_requests'],
                    'requestor_open': stats['requestor_open'],
                    'owner_open': stats['owner_open'],
                    'generated_at': timezone.now().isoformat(),
                    'last_updated': timezone.now().isoformat(),
                    'last_activity': date_range['last_activity'].isoformat() if date_range['last_activity'] else None,
                    'negotiation_date_range': {
                        'min_date': date_range['min_date'].isoformat() if date_range['min_date'] else None,
                        'max_date': date_range['max_date'].isoformat() if date_range['max_date'] else None,
                    }
                }]
            else:
                grouped_stats = (
                    NLink.objects
                    .filter(nlink_filter)
                    .values('data_label', 'record_label')
                    .annotate(
                        total_requests=Count('negotiation'),
                        accepted_requests=Count('negotiation', filter=Q(negotiation__state='accepted')),
                        rejected_requests=Count('negotiation', filter=Q(negotiation__state='rejected')),
                        requestor_open=Count('negotiation', filter=Q(negotiation__state='requestor_open')),
                        owner_open=Count('negotiation', filter=Q(negotiation__state='owner_open')),
                        min_date=Min('negotiation__timestamps'),
                        max_date=Max('negotiation__timestamps'),
                        last_activity=Max('last_activity'),
                    )
                )
                
                statistics_data = []
                for grp in grouped_stats:
                    statistics_data.append({
                        'data_label': grp['data_label'] or '',
                        'tag': ', '.join(sorted(tags_filter_cleaned)) if tags_filter else '',
                        'record_label': grp['record_label'] or '',
                        'total_requests': grp['total_requests'],
                        'accepted_requests': grp['accepted_requests'],
                        'rejected_requests': grp['rejected_requests'],
                        'requestor_open': grp['requestor_open'],
                        'owner_open': grp['owner_open'],
                        'generated_at': timezone.now().isoformat(),
                        'last_updated': timezone.now().isoformat(),
                        'last_activity': grp['last_activity'].isoformat() if grp['last_activity'] else None,
                        'negotiation_date_range': {
                            'min_date': grp['min_date'].isoformat() if grp['min_date'] else None,
                            'max_date': grp['max_date'].isoformat() if grp['max_date'] else None,
                        }
                    })
        else:
            # use pre-aggregated SummaryStatistic records 
            stats_qs = SummaryStatistic.objects.filter(owner_id__owner_id=owner_id)
            
            if data_label_filter:
                stats_qs = stats_qs.filter(data_label=data_label_filter)
            if record_label_filter:
                stats_qs = stats_qs.filter(record_label__in=record_label_filter)
            
            stats_qs = stats_qs.filter(tag='')
            
            if not stats_qs.exists():
                logger.warning(
                    f"No SummaryStatistic found for owner_id={owner_id}")
                return JsonResponse({'error': 'No summary statistics found.'}, status=404)

            statistics_data = []
            for stat in stats_qs:
                stats_block = stat.overall_stat or {}
                date_range = stats_block.get('negotiation_date_range', {})
                last_activity = stats_block.get('last_activity')
                statistics_data.append({
                    'data_label': stat.data_label,
                    'tag': stat.tag or '',
                    'record_label': getattr(stat, 'record_label', ''),
                    'total_requests': stats_block.get('total_requests', 0),
                    'accepted_requests': stats_block.get('accepted_requests', 0),
                    'rejected_requests': stats_block.get('rejected_requests', 0),
                    'requestor_open': stats_block.get('requestor_open', 0),
                    'owner_open': stats_block.get('owner_open', 0),
                    'generated_at': stat.summary_date.isoformat(),
                    'last_updated': stat.summary_date.isoformat(),
                    'last_activity': last_activity,  
                    'negotiation_date_range': date_range,
                })

        return JsonResponse({'summary_statistics': statistics_data})

    except ObjectDoesNotExist:
        return JsonResponse({'error': 'Owner statistics not found.'}, status=404)
    except Exception as e:
        logger.error(f"Error in summary_statistics_view: {e}", exc_info=True)
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
    """Auto-archive and export statistics when a negotiation is accepted, canceled, or rejected."""
    if instance.state in ['accepted', 'canceled', 'rejected'] and not instance.archived:
        handle_negotiation_archive_and_summary_task.delay(instance.negotiation_id)


def handle_negotiation_archive_and_summary_async(negotiation, owner_id=None):
    """
    Archives the negotiation and exports summary statistics asynchronously.
    """
    try:
        if owner_id is None and hasattr(negotiation, 'link') and negotiation.link:
            owner_id = negotiation.link.owner_id
            logger.info(f"Extracted owner_id={owner_id} from negotiation {negotiation.negotiation_id}")
        elif owner_id is None:
            logger.warning(f"Could not extract owner_id from negotiation {negotiation.negotiation_id}, processing all owners")
        
        with transaction.atomic():
            # Only regenerate stats for the affected owner
            export_summary_to_drt(owner_id=owner_id)
            if not negotiation.archived:
                archive_negotiation(negotiation)
        logger.info(f"Successfully processed negotiation {negotiation.negotiation_id} asynchronously for owner_id={owner_id}")
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

    include_questionnaire = str(
        request.GET.get("include_questionnaire", "false")
    ).lower() in ("1", "true", "yes")

    # Lightweight mode omits heavy JSON fields that are not needed for the
    # owner list UI; it can be disabled when a fuller payload is required.
    lightweight = str(
        request.GET.get("lightweight", "true")
    ).lower() in ("1", "true", "yes")

    owner_link_filter = request.GET.get("owner_link")

    # Filter parameters
    status_filter = request.GET.getlist("status")
    archived_filter = request.GET.get("archived", "all")
    start_date = request.GET.get("startDate")
    end_date = request.GET.get("endDate")
    tags_filter = request.GET.getlist("tags")
    record_label_filter = request.GET.getlist("record_label")
    search_term = request.GET.get("search", "").strip()

    # Pagination parameters
    try:
        page = int(request.GET.get("page", "1"))
    except ValueError:
        page = 1
    try:
        page_size = int(request.GET.get("page_size", "10"))
    except ValueError:
        page_size = 10

    page = max(page, 1)
    if page_size <= 0:
        page_size = 10
    page_size = min(page_size, 200)

    # Sort option 
    sort_option = request.GET.get("sort", "created_desc")

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

    if owner_link_filter:
        qs = qs.filter(link__owner_link=owner_link_filter)

    # Apply filters BEFORE pagination
    if status_filter:
        qs = qs.filter(state__in=status_filter)

    if archived_filter == "archived":
        qs = qs.filter(archived=True)
    elif archived_filter == "active":
        qs = qs.filter(archived=False)

    if start_date:
        try:
            start_dt = parse_datetime(start_date)
            if not start_dt:
                start_date_obj = parse_date(start_date)
                if start_date_obj:
                    start_dt = timezone.make_aware(
                        datetime.datetime.combine(start_date_obj, datetime.time.min)
                    )
            if start_dt:
                qs = qs.filter(timestamps__gte=start_dt)
        except (ValueError, TypeError):
            pass

    if end_date:
        try:
            end_dt = parse_datetime(end_date)
            if not end_dt:
                end_date_obj = parse_date(end_date)
                if end_date_obj:
                    end_dt = timezone.make_aware(
                        datetime.datetime.combine(end_date_obj, datetime.time.max)
                    )
            if end_dt:
                qs = qs.filter(timestamps__lte=end_dt)
        except (ValueError, TypeError):
            pass

    if tags_filter:
        # Filter negotiations where link.tags contains any of the specified tags
        tag_q = Q()
        for tag in tags_filter:
            tag_q |= Q(link__tags__contains=[tag])
        qs = qs.filter(tag_q)

    if record_label_filter:
        qs = qs.filter(link__record_label__in=record_label_filter)

    if search_term:
        # Search in negotiation_id and conversation_id
        qs = qs.filter(
            Q(negotiation_id__icontains=search_term) |
            Q(conversation_id__icontains=search_term)
        )

    # Apply sorting
    if sort_option == "created_asc":
        qs = qs.order_by("timestamps")
    elif sort_option == "created_desc":
        qs = qs.order_by("-timestamps")
    elif sort_option == "status_asc":
        qs = qs.order_by("state")
    elif sort_option == "status_desc":
        qs = qs.order_by("-state")
    else:
        # Default to newest first
        qs = qs.order_by("-timestamps")

    total = qs.count()

    if not owner_link_filter:
        start = (page - 1) * page_size
        end = start + page_size
        qs = qs[start:end]

    data = []
    for n in qs:
        link = getattr(n, 'link', None)

        questionnaire_json = None
        if include_questionnaire and n.questionnaire_SAID:
            try:
                cache_key = f'questionnaire_json_{n.questionnaire_SAID}'
                cached_json = cache.get(cache_key)

                if cached_json is not None:
                    questionnaire_json = cached_json
                else:
                    questionnaire_json = fetch_questionnaire_json(n.questionnaire_SAID)
                    # Cache the questionnaire JSON so subsequent calls are faster.
                    if questionnaire_json is not None:
                        cache.set(cache_key, questionnaire_json)
            except Exception as e:
                print(f"Error fetching questionnaire for {n.questionnaire_SAID}: {e}")
                questionnaire_json = None

        item = {
            'negotiation_id':     str(n.negotiation_id),
            'conversation_id':    str(n.conversation_id),
            'state':              n.state,
            'reminder_sent':      n.reminder_sent,
            'questionnaire_SAID': n.questionnaire_SAID,
            'questionnaire':      questionnaire_json,
            'timestamps':         n.timestamps.isoformat(),
            'archived':           n.archived,
            'owner_link':         str(link.owner_link) if link else None,
            'rationale':          n.rationale,
            'tags': link.tags if link else [],
            'record_label': link.record_label if link else "",
        }

        # Heavy fields included only when lightweight mode is disabled
        if not lightweight:
            item.update({
                'requestor_responses': n.requestor_responses,
                'owner_responses':    n.owner_responses,
                'comments':           n.comments,
            })

        data.append(item)

    total_pages = (total + page_size - 1) // page_size if page_size else 1

    response_payload = {
        "results": data,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }

    return JsonResponse(response_payload)


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
            license_template_content = fetch_license_template(license_id)
        
        if license_template_content:
            # Create template from string content and render it as human-readable text
            template = Template(license_template_content)
            content_type = "text/plain"
            filename = "license.txt"
            owner_table = cache.get("owner_table")
            
            # Import the flatten function from license service
            details = flatten_form_data(submission)
            
            context = {"submission": details, "owner_table": owner_table}
            rendered = template.render(**context)
        else:
            # Fallback to hardcoded template if GitHub fetch fails
            print(f"⚠️ License template not found for {license_id}, using fallback template")
            env = Environment(
                loader=FileSystemLoader("drt/templates"),
                autoescape=select_autoescape(["html", "xml", "json"])
            )
            template = env.get_template("license_template_fallback.jinja")
            content_type = "text/plain"
            filename = "license.txt"
            owner_table = cache.get("owner_table")
            
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
            
            license_template_content = fetch_license_template(license_id)
            
        if license_template_content:
            template = Template(license_template_content)
            rendered = template.render(submission=details, owner_table=owner_table)
        else:
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
        negotiation = get_object_or_404(Negotiation, negotiation_id=negotiation_id)

        # Questionnaire JSON for labels
        questionnaire_json = None
        try:
            cache_key = f'questionnaire_json_{negotiation.questionnaire_SAID}'
            cached_json = cache.get(cache_key)
            if cached_json:
                questionnaire_json = cached_json
            else:
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


@owner_auth_required
def reopen_negotiation_view(request, negotiation_id):
    """Reopen a previously Accepted/Rejected/Abandoned negotiation"""
    try:
        negotiation = get_object_or_404(Negotiation, pk=negotiation_id)
        
        if negotiation.state not in ['accepted', 'rejected', 'abandoned']:
            return JsonResponse({
                'error': 'Only Accepted, Rejected, or Abandoned negotiations can be reopened'
            }, status=400)
        
        previous_state = negotiation.state
        
        new_state = 'owner_open'
        
        # Create archive snapshot before changing state
        create_archive_snapshot(
            negotiation,
            changed_by=request.owner_email or "owner",
            change_description=f"Owner reopened negotiation from {previous_state} state"
        )
        
        negotiation.state = new_state
        negotiation.save()
        
        # Send email notification to requestor
        if hasattr(negotiation, 'link') and negotiation.link:
            requestor_email = negotiation.link.requestor_email
            if requestor_email:
                send_reopen_notification_email_task.delay(
                    requestor_email, 
                    str(negotiation.link.requestor_link), 
                    previous_state
                )
        
        return JsonResponse({
            'message': f'Negotiation reopened successfully from {previous_state} to {new_state}',
            'new_state': new_state
        })
        
    except Exception as e:
        logger.error(f"Error reopening negotiation {negotiation_id}: {str(e)}")
        return JsonResponse({
            'error': 'An error occurred while reopening the negotiation'
        }, status=500)


@csrf_exempt
def process_abandonment_policy_view(request):
    """Manually trigger the abandonment policy processing."""
    try:
        result = process_abandonment_policy()
        return JsonResponse(result)
    except Exception as e:
        logger.error(f"Error processing abandonment policy: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@requestor_auth_required
def abandon_negotiation_view(request, negotiation_id):
    """Allow requestor to abandon their own negotiation."""
    try:
        negotiation = get_object_or_404(Negotiation, pk=negotiation_id)
        
        if not hasattr(negotiation, 'link') or not negotiation.link:
            return JsonResponse({'error': 'Negotiation link not found'}, status=404)
            
        if negotiation.link.requestor_email != request.requestor_email:
            return JsonResponse({'error': 'Unauthorized access to this negotiation'}, status=403)
        
        if negotiation.state not in ['requestor_open', 'owner_open']:
            return JsonResponse({
                'error': 'Only active negotiations can be abandoned'
            }, status=400)
        
        
        if abandon_negotiation_by_requestor(negotiation):
            return JsonResponse({
                'message': 'Negotiation abandoned successfully',
                'new_state': 'abandoned'
            })
        else:
            return JsonResponse({
                'error': 'Failed to abandon negotiation'
            }, status=500)
        
    except Exception as e:
        logger.error(f"Error abandoning negotiation {negotiation_id}: {str(e)}")
        return JsonResponse({
            'error': 'An error occurred while abandoning the negotiation'
        }, status=500)
