from django.urls import NoReverseMatch, reverse
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
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
from datastore.cache_keys import (
    KEY_OWNER_TABLE,
    license_template_key,
    questionnaire_json_key,
)
from jinja2 import Template, Environment, FileSystemLoader, select_autoescape
from drt.services.license import flatten_form_data        
from .questionnaire import create_archive_snapshot
from django.conf import settings


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
            abandoned_requests=Count('negotiation', filter=Q(
                negotiation__state='abandoned')),
            archived_requests=Count('negotiation', filter=Q(
                negotiation__state='archived')),
        )
    )
    stats_count = per_group_stats.count()
    logger.info(f"Found {stats_count} owner/dataset/record_label groups")

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
            'abandoned_requests': grp['abandoned_requests'],
            'archived_requests': grp['archived_requests'],
            'requestor_domains': requestor_domains,
            'generated_at':      timezone.now().isoformat(),
            'negotiation_date_range': {
                'min_date': date_range['min_date'].isoformat() if date_range['min_date'] else None,
                'max_date': date_range['max_date'].isoformat() if date_range['max_date'] else None,
            },
            'last_activity': date_range['last_activity'].isoformat() if date_range['last_activity'] else None,
        }
        datasets_list = [ds_id]

        # Handle potential duplicates by getting the most recent one first
        try:
            stat_obj, created = SummaryStatistic.objects.update_or_create(
                owner_id=nlink,
                datasets_requested=datasets_list,
                data_label=ds_label,
                tag='',  
                record_label=record_label,
                defaults={'overall_stat': overall_stat, 'record_label': record_label},
            )
            action = "Created" if created else "Updated"
        except MultipleObjectsReturned:
            # Handle duplicate records - get the most recent one and delete others
            existing_stats = SummaryStatistic.objects.filter(
                owner_id=nlink,
                datasets_requested=datasets_list,
                data_label=ds_label,
                tag='',
                record_label=record_label
            ).order_by('-summary_date')
            
            # Keep the most recent one
            stat_obj = existing_stats.first()
            if stat_obj is None:
                stat_obj = SummaryStatistic.objects.create(
                    owner_id=nlink,
                    datasets_requested=datasets_list,
                    data_label=ds_label,
                    tag='',
                    record_label=record_label,
                    overall_stat=overall_stat
                )
                created = True
                action = "Created (after cleanup error)"
            else:
                all_stat_ids = list(existing_stats.values_list('id', flat=True))
                duplicate_ids = all_stat_ids[1:]  
                
                if duplicate_ids:
                    SummaryStatistic.objects.filter(id__in=duplicate_ids).delete()
                
                stat_obj.overall_stat = overall_stat
                stat_obj.record_label = record_label
                stat_obj.save()
                created = False
                action = "Updated (after cleanup)"
        
        logger.info(f"{action} no‐tag summary for NLink pk={nlink.pk}")

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
                abandoned_requests=Count('negotiation', filter=Q(
                    negotiation__state='abandoned')),
                archived_requests=Count('negotiation', filter=Q(
                    negotiation__state='archived')),
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
                'abandoned_requests': tag_stats['abandoned_requests'],
                'archived_requests': tag_stats['archived_requests'],
                'requestor_domains': requestor_domains,
                'generated_at':      timezone.now().isoformat(),
                'negotiation_date_range': {
                    'min_date': tag_date_range['min_date'].isoformat() if tag_date_range['min_date'] else None,
                    'max_date': tag_date_range['max_date'].isoformat() if tag_date_range['max_date'] else None,
                },
                'last_activity': tag_date_range['last_activity'].isoformat() if tag_date_range['last_activity'] else None,
            }

            try:
                tag_stat_obj, tag_created = SummaryStatistic.objects.update_or_create(
                    owner_id=nlink,
                    datasets_requested=datasets_list,
                    data_label=ds_label,
                    tag=t,
                    record_label=record_label,
                    defaults={'overall_stat': tag_stat_payload, 'record_label': record_label},
                )
                tag_action = "Created" if tag_created else "Updated"
            except MultipleObjectsReturned:
                # Handle duplicate records - get the most recent one and delete others
                existing_tag_stats = SummaryStatistic.objects.filter(
                    owner_id=nlink,
                    datasets_requested=datasets_list,
                    data_label=ds_label,
                    tag=t,
                    record_label=record_label
                ).order_by('-summary_date')
                
                # Keep the most recent one
                tag_stat_obj = existing_tag_stats.first()
                if tag_stat_obj is None:
                    tag_stat_obj = SummaryStatistic.objects.create(
                        owner_id=nlink,
                        datasets_requested=datasets_list,
                        data_label=ds_label,
                        tag=t,
                        record_label=record_label,
                        overall_stat=tag_stat_payload
                    )
                    tag_created = True
                    tag_action = "Created (after cleanup error)"
                else:
                    all_tag_stat_ids = list(existing_tag_stats.values_list('id', flat=True))
                    tag_duplicate_ids = all_tag_stat_ids[1:]  
                    
                    if tag_duplicate_ids:
                        SummaryStatistic.objects.filter(id__in=tag_duplicate_ids).delete()
                    
                    tag_stat_obj.overall_stat = tag_stat_payload
                    tag_stat_obj.record_label = record_label
                    tag_stat_obj.save()
                    tag_created = False
                    tag_action = "Updated (after cleanup)"
            
            logger.info(f"{tag_action} tag={t!r} summary for NLink pk={nlink.pk}")


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
    base_url = getattr(settings, "FRONTEND_BASE_URL", "http://127.0.0.1:3000").rstrip("/")

    entries = []
    for cache_key, row in raw_link_cache.items():
        if row.get("owner_id") in owner_ids:
            link_uuid = row.get("link_uuid")
            url = f"{base_url}/negotiation/generate/{link_uuid}" if link_uuid else cache_key
            entries.append(
                {
                    "url": url,
                    "questionnaireId": row.get("questionnaire_id"),
                    "licenseId": row.get("license_id"),
                    "expiry": row.get("expiry") or "Never",
                    "label": row.get("visible_label") or row.get("data_label", ""),
                    "tags": row.get("tags", "(none)"),
                    "recordLabel": row.get("record_label", ""),
                }
            )

    return JsonResponse({"links": entries})


def _validate_summary_stats(stat):
    """
    Validate that all state counts sum exactly to total_requests.
    """
    total = stat.get('total_requests', 0)
    accepted = stat.get('accepted_requests', 0)
    rejected = stat.get('rejected_requests', 0)
    requestor_open = stat.get('requestor_open', 0)
    owner_open = stat.get('owner_open', 0)
    abandoned = stat.get('abandoned_requests', 0)
    archived = stat.get('archived_requests', 0)
    
    sum_of_all_states = (
        accepted + rejected + requestor_open + owner_open + abandoned + archived
    )
    
    if sum_of_all_states != total:
        difference = abs(total - sum_of_all_states)
        return {
            'is_valid': False,
            'message': f'Data inconsistency: State counts ({sum_of_all_states}) do not match total requests ({total}). Difference: {difference}',
            'difference': difference
        }
    else:
        return {
            'is_valid': True,
            'message': None,
            'difference': 0
        }


def _group_summary_statistics(statistics_data):
    """
    Group summary statistics by (record_label, data_label) 
    """
    no_tag_records = [d for d in statistics_data if not d.get('tag') or d.get('tag') == '']
    tagged_records = [d for d in statistics_data if d.get('tag') and d.get('tag') != '']
    
    groups_with_tags = set()
    for d in tagged_records:
        key = f"{d.get('record_label', '')}|{d.get('data_label', '')}"
        groups_with_tags.add(key)
    
    grouped_map = {}
    
    for d in statistics_data:
        key = f"{d.get('record_label', '')}|{d.get('data_label', '')}"
        is_no_tag_record = not d.get('tag') or d.get('tag') == ''
        has_tagged_records = key in groups_with_tags
        
        
        if is_no_tag_record and has_tagged_records:
            continue
        
        if key not in grouped_map:
            grouped_map[key] = {
                'record_label': d.get('record_label', ''),
                'data_label': d.get('data_label', ''),
                'total_requests': d.get('total_requests', 0),
                'accepted_requests': d.get('accepted_requests', 0),
                'rejected_requests': d.get('rejected_requests', 0),
                'requestor_open': d.get('requestor_open', 0),
                'owner_open': d.get('owner_open', 0),
                'abandoned_requests': d.get('abandoned_requests', 0),
                'archived_requests': d.get('archived_requests', 0),
                'last_updated': d.get('last_updated') or d.get('generated_at', ''),
                'last_activity': d.get('last_activity'),
                'negotiation_date_range': d.get('negotiation_date_range', {}),
            }
        else:
            entry = grouped_map[key]
            entry['total_requests'] += d.get('total_requests', 0)
            entry['accepted_requests'] += d.get('accepted_requests', 0)
            entry['rejected_requests'] += d.get('rejected_requests', 0)
            entry['requestor_open'] += d.get('requestor_open', 0)
            entry['owner_open'] += d.get('owner_open', 0)
            entry['abandoned_requests'] += d.get('abandoned_requests', 0)
            entry['archived_requests'] += d.get('archived_requests', 0)
            
            current_updated = d.get('last_updated') or d.get('generated_at', '')
            if current_updated and current_updated > entry['last_updated']:
                entry['last_updated'] = current_updated
            
            current_activity = d.get('last_activity')
            if current_activity and (not entry['last_activity'] or current_activity > entry['last_activity']):
                entry['last_activity'] = current_activity
            
            incoming_range = d.get('negotiation_date_range', {})
            if incoming_range:
                if not entry['negotiation_date_range']:
                    entry['negotiation_date_range'] = incoming_range
                else:
                    existing = entry['negotiation_date_range']
                    if incoming_range.get('min_date') and (not existing.get('min_date') or incoming_range['min_date'] < existing['min_date']):
                        existing['min_date'] = incoming_range['min_date']
                    if incoming_range.get('max_date') and (not existing.get('max_date') or incoming_range['max_date'] > existing['max_date']):
                        existing['max_date'] = incoming_range['max_date']
    
    # Validate each grouped entry and add validation status
    result = []
    for entry in grouped_map.values():
        validation = _validate_summary_stats(entry)
        if not validation['is_valid']:
            logger.warning(
                f"Invalid stats for {entry.get('record_label', '')}/{entry.get('data_label', '')}: {validation['message']}"
            )
        entry['validation_status'] = validation
        result.append(entry)
    
    return result


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

    logger.debug(f"summary_statistics_view: email={email}, found owner_ids={owner_ids}, cache_size={len(cache_data)}")

    # If no owner_ids found, return empty array
    if not owner_ids:
        logger.warning(f"No owner_id found for email={email}")
        return JsonResponse({'summary_statistics': []})

    # Get filter parameters
    tags_filter = request.GET.getlist("tags")  # Multiple tags = AND logic
    data_label_filter = request.GET.get("data_label")
    record_label_filter = request.GET.getlist("record_label")
    include_all_tags = request.GET.get("include_all_tags", "false").lower() == "true"
    group_by = request.GET.get("group_by", "false").lower() == "true"
    
    # Get date filter parameters (for negotiation dates)
    start_date = request.GET.get("startDate")
    end_date = request.GET.get("endDate")
    
    has_date_filter = bool(start_date or end_date)
    has_tag_filter = bool(tags_filter)
    
    use_direct_query = has_date_filter or has_tag_filter or group_by

    try:
        if include_all_tags:
            nlink_qs = NLink.objects.filter(owner_id__in=owner_ids)
            
            logger.debug(f"include_all_tags query: owner_ids={owner_ids}, found {nlink_qs.count()} NLink records")
            
            if not nlink_qs.exists():
                logger.warning(
                    f"No NLink found for owner_ids={owner_ids}, email={email}")
                return JsonResponse({'summary_statistics': []})

            grouped_data = (
                nlink_qs
                .values('data_label', 'record_label', 'tags')
                .annotate(
                    total_requests=Count('negotiation'),
                    accepted_requests=Count('negotiation', filter=Q(negotiation__state='accepted')),
                    rejected_requests=Count('negotiation', filter=Q(negotiation__state='rejected')),
                    requestor_open=Count('negotiation', filter=Q(negotiation__state='requestor_open')),
                    owner_open=Count('negotiation', filter=Q(negotiation__state='owner_open')),
                    abandoned_requests=Count('negotiation', filter=Q(negotiation__state='abandoned')),
                    archived_requests=Count('negotiation', filter=Q(negotiation__state='archived')),
                    min_date=Min('negotiation__timestamps'),
                    max_date=Max('negotiation__timestamps'),
                    last_activity=Max('last_activity'),
                )
            )
            
            statistics_data = []
            for grp in grouped_data:
                tags_list = grp.get('tags') or []
                tags_cleaned = [t for t in tags_list if t and str(t).strip()]
                tag_str = ', '.join(sorted(tags_cleaned)) if tags_cleaned else ''
                
                statistics_data.append({
                    'data_label': grp.get('data_label') or '',
                    'tag': tag_str,
                    'record_label': grp.get('record_label') or '',
                    'total_requests': grp['total_requests'],
                    'accepted_requests': grp['accepted_requests'],
                    'rejected_requests': grp['rejected_requests'],
                    'requestor_open': grp['requestor_open'],
                    'owner_open': grp['owner_open'],
                    'abandoned_requests': grp['abandoned_requests'],
                    'archived_requests': grp['archived_requests'],
                    'generated_at': timezone.now().isoformat(),
                    'last_updated': timezone.now().isoformat(),
                    'last_activity': grp['last_activity'].isoformat() if grp['last_activity'] else None,
                    'negotiation_date_range': {
                        'min_date': grp['min_date'].isoformat() if grp['min_date'] else None,
                        'max_date': grp['max_date'].isoformat() if grp['max_date'] else None,
                    }
                })

            return JsonResponse({'summary_statistics': statistics_data})
        
        if use_direct_query:
            nlink_filter = Q(owner_id__in=owner_ids)
            
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
                    abandoned_requests=Count('negotiation', filter=Q(negotiation__state='abandoned')),
                    archived_requests=Count('negotiation', filter=Q(negotiation__state='archived')),
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
                    'abandoned_requests': stats['abandoned_requests'],
                    'archived_requests': stats['archived_requests'],
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
                        abandoned_requests=Count('negotiation', filter=Q(negotiation__state='abandoned')),
                        archived_requests=Count('negotiation', filter=Q(negotiation__state='archived')),
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
                        'abandoned_requests': grp['abandoned_requests'],
                        'archived_requests': grp['archived_requests'],
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
            stats_qs = SummaryStatistic.objects.filter(owner_id__owner_id__in=owner_ids)
            
            if data_label_filter:
                stats_qs = stats_qs.filter(data_label=data_label_filter)
            if record_label_filter:
                stats_qs = stats_qs.filter(record_label__in=record_label_filter)
            
            stats_qs = stats_qs.filter(tag='')
            
            if not stats_qs.exists():
                logger.warning(
                    f"No SummaryStatistic found for owner_ids={owner_ids}, email={email}")
                return JsonResponse({'summary_statistics': []})

            statistics_data = []
            for stat in stats_qs:
                stats_block = stat.overall_stat or {}
                date_range = stats_block.get('negotiation_date_range', {})
                last_activity = stats_block.get('last_activity')
                stat_entry = {
                    'data_label': stat.data_label,
                    'tag': stat.tag or '',
                    'record_label': getattr(stat, 'record_label', ''),
                    'total_requests': stats_block.get('total_requests', 0),
                    'accepted_requests': stats_block.get('accepted_requests', 0),
                    'rejected_requests': stats_block.get('rejected_requests', 0),
                    'requestor_open': stats_block.get('requestor_open', 0),
                    'owner_open': stats_block.get('owner_open', 0),
                    'abandoned_requests': stats_block.get('abandoned_requests', 0),
                    'archived_requests': stats_block.get('archived_requests', 0),
                    'generated_at': stat.summary_date.isoformat(),
                    'last_updated': stat.summary_date.isoformat(),
                    'last_activity': last_activity,  
                    'negotiation_date_range': date_range,
                }
                statistics_data.append(stat_entry)
        
        if group_by:
            statistics_data = _group_summary_statistics(statistics_data)

        return JsonResponse({'summary_statistics': statistics_data})

    except ObjectDoesNotExist:
        return JsonResponse({'error': 'Owner statistics not found.'}, status=404)
    except Exception as e:
        logger.error(f"Error in summary_statistics_view: {e}", exc_info=True)
        return JsonResponse({'error': 'Internal server error.'}, status=500)


def archive_negotiation(negotiation):
    """Archive the negotiation and save relevant data."""
    # Check if archive already exists
    existing_archive = Archive.objects.filter(negotiation=negotiation).first()
    if existing_archive:
        negotiation.archived = True
        negotiation.save()
        return
    
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
    if negotiation.state in ['accepted', 'canceled', 'rejected', 'abandoned']:
        return handle_negotiation_archive_and_summary(negotiation)
    else:
        return JsonResponse(
            {'message': _('Only accepted, canceled,  rejected, or abandoned negotiations can be archived')}, status=400
        )


@receiver(post_save, sender=Negotiation)
def generate_summary_statistics(sender, instance, **kwargs):
    """Auto-archive and export statistics when a negotiation is accepted, canceled, rejected, or abandoned."""
    if instance.state in ['accepted', 'canceled', 'rejected', 'abandoned'] and not instance.archived:
        handle_negotiation_archive_and_summary_task.delay(instance.negotiation_id)


def handle_negotiation_archive_and_summary_async(negotiation, owner_id=None):
    """
    Archives the negotiation and exports summary statistics asynchronously.
    """
    negotiation.refresh_from_db()
    
    try:
        if owner_id is None and hasattr(negotiation, 'link') and negotiation.link:
            owner_id = negotiation.link.owner_id
            logger.info(f"Extracted owner_id={owner_id} from negotiation {negotiation.negotiation_id}")
        elif owner_id is None:
            logger.warning(f"Could not extract owner_id from negotiation {negotiation.negotiation_id}, processing all owners")
        
        try:
            with transaction.atomic():
                export_summary_to_drt(owner_id=owner_id)
        except Exception as stats_error:
            logger.error(f"Error calculating summary stats for negotiation {negotiation.negotiation_id}: {stats_error}")
            raise  
        
        # Archive negotiation in a separate transaction
        if not negotiation.archived:
            try:
                with transaction.atomic():
                    archive_negotiation(negotiation)
            except Exception as archive_error:
                logger.error(f"Error archiving negotiation {negotiation.negotiation_id}: {archive_error}")
        
        logger.info(f"Successfully processed negotiation {negotiation.negotiation_id} asynchronously for owner_id={owner_id}")
    except Exception as e:
        logger.error(f"Error processing negotiation {negotiation.negotiation_id} asynchronously: {e}", exc_info=True)


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

        # Serve from cache only. The cache is warmed by the fill-questionnaire / owner-review flows and
        # by `warm_github_cache`; rows whose JSON is not yet warm simply omit
        # it (the requestor list UI does not currently use this field).
        try:
            questionnaire_json = cache.get(questionnaire_json_key(n.questionnaire_SAID))
        except Exception as e:
            logger.warning(
                "Cache read failed for questionnaire %s: %s",
                n.questionnaire_SAID, e,
            )
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
            'visible_label': (requestor_link.visible_label or requestor_link.record_label or requestor_link.data_label or "") if requestor_link else "",
            'record_label': requestor_link.record_label if requestor_link else "",
            'requestor_email': requestor_link.requestor_email if requestor_link else None,
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
        qs = qs.filter(
            Q(negotiation_id__icontains=search_term) |
            Q(conversation_id__icontains=search_term) |
            Q(link__visible_label__icontains=search_term) |
            Q(link__record_label__icontains=search_term)
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
                questionnaire_json = cache.get(questionnaire_json_key(n.questionnaire_SAID))
            except Exception as e:
                logger.warning(
                    "Cache read failed for questionnaire %s: %s",
                    n.questionnaire_SAID, e,
                )
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
            'visible_label': (link.visible_label or link.record_label or link.data_label or "") if link else "",
            'requestor_email': link.requestor_email if link else None,
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
        cache_key = license_template_key(license_id)
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
        cache_key = license_template_key(license_id)
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


def _build_history_response(negotiation):
    """Build the JSON response payload for a negotiation's history.
    """
    questionnaire_json = None
    try:
        cached_json = cache.get(questionnaire_json_key(negotiation.questionnaire_SAID))
        if cached_json:
            questionnaire_json = cached_json
        else:
            questionnaire_json = fetch_questionnaire_json(negotiation.questionnaire_SAID)
    except Exception as e:
        logger.error(
            f"Error fetching questionnaire for {negotiation.questionnaire_SAID}: {e}"
        )
        questionnaire_json = None

    archives = get_archive_history(negotiation)
    version_history = map_archives_to_versions(archives)

    return JsonResponse({
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
    })


@owner_auth_required
def negotiation_history_view(request, negotiation_id):
    """Owner-facing negotiation history.
    """
    try:
        negotiation = get_object_or_404(Negotiation, negotiation_id=negotiation_id)
        return _build_history_response(negotiation)
    except Exception as e:
        logger.error(
            f"Error fetching history for negotiation {negotiation_id}: {str(e)}"
        )
        return JsonResponse(
            {"error": "Failed to fetch negotiation history"}, status=500
        )


@requestor_auth_required
def negotiation_history_view_req(request, negotiation_id):
    """Requestor-facing negotiation history.
    """
    try:
        negotiation = get_object_or_404(
            Negotiation.objects.select_related('link'),
            negotiation_id=negotiation_id,
        )

        link = getattr(negotiation, 'link', None)
        link_requestor = (
            (link.requestor_email or '').strip().lower() if link else ''
        )
        session_requestor = (request.requestor_email or '').strip().lower()

        if not link_requestor or link_requestor != session_requestor:
            logger.warning(
                "negotiation_history_view_req: access denied for "
                "negotiation_id=%s (session=%r, link=%r)",
                negotiation_id,
                session_requestor or None,
                link_requestor or None,
            )
            return JsonResponse(
                {"error": "You do not have permission to view this negotiation."},
                status=403,
            )

        return _build_history_response(negotiation)
    except Exception as e:
        logger.error(
            f"Error fetching history for negotiation {negotiation_id}: {str(e)}"
        )
        return JsonResponse(
            {"error": "Failed to fetch negotiation history"}, status=500
        )


@owner_auth_required
def reopen_negotiation_view(request, negotiation_id):
    """Reopen a previously Accepted/Rejected/Abandoned negotiation"""
    try:
        negotiation = get_object_or_404(Negotiation, pk=negotiation_id)
        previous_state = negotiation.state
        
        if negotiation.state not in ['accepted', 'rejected', 'abandoned']:
            return JsonResponse({
                'error': 'Only Accepted, Rejected, or Abandoned negotiations can be reopened'
            }, status=400)
        
        new_state = 'owner_open'
        
        # Create archive snapshot before changing state
        create_archive_snapshot(
            negotiation,
            changed_by=request.owner_email or "owner",
            change_description=f"Owner reopened negotiation from {previous_state} state"
        )
        
        negotiation.state = new_state
        # Un-archive when reopening so it can be edited again
        if negotiation.archived:
            negotiation.archived = False
        negotiation.save()
        
        # Recalculate summary statistics when reopening from final states
        if previous_state in ['accepted', 'rejected', 'canceled', 'abandoned']:
            try:
                owner_id = None
                if hasattr(negotiation, 'link') and negotiation.link:
                    owner_id = negotiation.link.owner_id
                
                with transaction.atomic():
                    export_summary_to_drt(owner_id=owner_id)
            except Exception as stats_error:
                logger.error(f"Error recalculating stats for reopened negotiation {negotiation_id}: {stats_error}", exc_info=True)
        
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
