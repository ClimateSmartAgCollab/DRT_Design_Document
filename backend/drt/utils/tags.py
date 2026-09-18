"""Shared helpers for NLink.tags ArrayField values and query filters."""
from typing import Iterable, Literal

TAG_MAX_LENGTH = 64
TAG_MATCH_ANY = "any"
TAG_MATCH_ALL = "all"
TAG_MATCH_DEFAULT = TAG_MATCH_ALL
_ALLOWED_MATCH = frozenset({TAG_MATCH_ANY, TAG_MATCH_ALL})

TagMatch = Literal["any", "all"]


def normalize_tags(raw) -> list[str]:
    """Return a stable, write-safe tag list.

    Accepts a CSV string or an iterable of values. Strips whitespace, drops
    empties, truncates to TAG_MAX_LENGTH, and dedupes while preserving order.
    """
    if raw is None:
        return []

    if isinstance(raw, str):
        parts = raw.split(",")
    elif isinstance(raw, Iterable) and not isinstance(raw, (bytes, bytearray)):
        parts = raw
    else:
        return []

    seen: set[str] = set()
    tags: list[str] = []
    for part in parts:
        if not isinstance(part, str):
            continue
        tag = part.strip()[:TAG_MAX_LENGTH]
        if not tag or tag in seen:
            continue
        seen.add(tag)
        tags.append(tag)
    return tags


def parse_tag_match(value, default: TagMatch = TAG_MATCH_DEFAULT) -> TagMatch:
    """Return 'any' or 'all'; unknown/empty values fall back to default."""
    fallback: TagMatch = (
        default if default in _ALLOWED_MATCH else TAG_MATCH_DEFAULT
    )
    if value is None:
        return fallback
    parsed = str(value).strip().lower()
    if parsed in _ALLOWED_MATCH:
        return parsed  # type: ignore[return-value]
    return fallback


def apply_tag_filter(queryset, tags, *, match, field: str = "tags"):
    """Apply ArrayField tag matching to a queryset.

    Empty tags leave the queryset unchanged. 'any' uses overlap; 'all'
    requires every tag via successive contains filters.
    """
    normalized = normalize_tags(tags)
    if not normalized:
        return queryset

    mode = parse_tag_match(match, default=TAG_MATCH_DEFAULT)
    if mode == TAG_MATCH_ANY:
        return queryset.filter(**{f"{field}__overlap": normalized})

    for tag in normalized:
        queryset = queryset.filter(**{f"{field}__contains": [tag]})
    return queryset
