import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Status, ArchivedFilter, SortOption, type FulfillmentStatus, type TagMatch } from '../types';
import { nextTagSelection } from '../../components/TagChip';
import { useDebounce } from './useDebounce';
import { 
  parseStatusFilter, 
  parseArchivedFilter, 
  parseSortOption, 
  parseCsvList,
  parseDateField,
  parseFulfillmentStatus,
  parseTagMatch,
  validateDate,
  buildQueryString 
} from '../utils/urlParams';

interface FilterState {
  searchTerm: string;
  statusFilter: Status[];
  archivedFilter: ArchivedFilter;
  startDate: string;
  endDate: string;
  sortOption: SortOption;
  tags: string[];
  recordLabel: string[];
  dataLabel: string[];
  dateField: 'created' | 'decided';
  fulfillmentStatusFilter: FulfillmentStatus[];
  tagMatch: TagMatch;
}

const DEFAULT_FILTERS: FilterState = {
  searchTerm: '',
  statusFilter: [],
  archivedFilter: 'all',
  startDate: '',
  endDate: '',
  sortOption: 'created_desc',
  tags: [],
  recordLabel: [],
  dataLabel: [],
  dateField: 'created',
  fulfillmentStatusFilter: [],
  tagMatch: 'all',
};

function filtersFromSearchParams(searchParams: URLSearchParams): FilterState {
  const startDate = validateDate(searchParams.get('startDate') || '')
    ? searchParams.get('startDate') || ''
    : '';
  const endDate = validateDate(searchParams.get('endDate') || '')
    ? searchParams.get('endDate') || ''
    : '';

  return {
    searchTerm: searchParams.get('search') || '',
    statusFilter: parseStatusFilter(searchParams.get('status')),
    archivedFilter: parseArchivedFilter(searchParams.get('archived')),
    startDate,
    endDate,
    sortOption: parseSortOption(searchParams.get('sort')),
    tags: parseCsvList(searchParams.get('tags')),
    recordLabel: parseCsvList(searchParams.get('record_label')),
    dataLabel: parseCsvList(searchParams.get('data_label')),
    dateField: parseDateField(searchParams.get('dateField')),
    fulfillmentStatusFilter: parseFulfillmentStatus(
      searchParams.get('fulfillment_status')
    ),
    tagMatch: parseTagMatch(searchParams.get('tag_match')),
  };
}

export function useFilterState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [filters, setFilters] = useState<FilterState>(() =>
    filtersFromSearchParams(searchParams)
  );

  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

  const updateURL = useCallback((newFilters: FilterState) => {
    const params: Record<string, string | string[]> = {};
    
    if (newFilters.searchTerm) params.search = newFilters.searchTerm;
    if (newFilters.statusFilter.length > 0) params.status = newFilters.statusFilter;
    if (newFilters.archivedFilter !== 'all') params.archived = newFilters.archivedFilter;
    if (newFilters.startDate) params.startDate = newFilters.startDate;
    if (newFilters.endDate) params.endDate = newFilters.endDate;
    if (newFilters.sortOption !== 'created_desc') params.sort = newFilters.sortOption;
    if (newFilters.tags.length > 0) params.tags = newFilters.tags;
    if (newFilters.recordLabel.length > 0) params.record_label = newFilters.recordLabel;
    if (newFilters.dataLabel.length > 0) params.data_label = newFilters.dataLabel;
    if (newFilters.dateField && newFilters.dateField !== 'created') {
      params.dateField = newFilters.dateField;
    }
    if (newFilters.fulfillmentStatusFilter.length > 0) {
      params.fulfillment_status = newFilters.fulfillmentStatusFilter;
    }
    if (newFilters.tagMatch === 'any') {
      params.tag_match = 'any';
    }
    
    const queryString = buildQueryString(params);
    const newURL = queryString ? `?${queryString}` : '';
    
    router.replace(`/negotiation/owner/list${newURL}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const newFilters = { ...filters, searchTerm: debouncedSearchTerm };
    updateURL(newFilters);
  }, [debouncedSearchTerm, updateURL, filters]);

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    
    if (!updates.hasOwnProperty('searchTerm')) {
      updateURL(newFilters);
    }
  }, [filters, updateURL]);

  const setSearchTerm = useCallback((searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  }, []);

  const toggleStatus = useCallback((status: Status) => {
    const newStatusFilter = filters.statusFilter.includes(status)
      ? filters.statusFilter.filter(s => s !== status)
      : [...filters.statusFilter, status];
    updateFilters({ statusFilter: newStatusFilter });
  }, [filters.statusFilter, updateFilters]);

  const setArchivedFilter = useCallback((archivedFilter: ArchivedFilter) => {
    updateFilters({ archivedFilter });
  }, [updateFilters]);

  const setDateRange = useCallback((field: 'start' | 'end', value: string) => {
    if (value && !validateDate(value)) return;
    
    updateFilters({
      startDate: field === 'start' ? value : filters.startDate,
      endDate: field === 'end' ? value : filters.endDate,
    });
  }, [filters.startDate, filters.endDate, updateFilters]);

  const setSortOption = useCallback((sortOption: SortOption) => {
    updateFilters({ sortOption });
  }, [updateFilters]);

  const setTags = useCallback((tags: string[]) => {
    updateFilters({ tags });
  }, [updateFilters]);

  const toggleTag = useCallback((tag: string) => {
    updateFilters({ tags: nextTagSelection(filters.tags, tag) });
  }, [filters.tags, updateFilters]);

  const setRecordLabel = useCallback((recordLabel: string[]) => {
    updateFilters({ recordLabel });
  }, [updateFilters]);

  const setDataLabel = useCallback((dataLabel: string[]) => {
    updateFilters({ dataLabel });
  }, [updateFilters]);

  const setDateField = useCallback((dateField: FilterState['dateField']) => {
    updateFilters({ dateField });
  }, [updateFilters]);

  const toggleFulfillmentStatus = useCallback((status: FulfillmentStatus) => {
    const next = filters.fulfillmentStatusFilter.includes(status)
      ? filters.fulfillmentStatusFilter.filter((value) => value !== status)
      : [...filters.fulfillmentStatusFilter, status];
    updateFilters({ fulfillmentStatusFilter: next });
  }, [filters.fulfillmentStatusFilter, updateFilters]);

  const setTagMatch = useCallback((tagMatch: TagMatch) => {
    updateFilters({ tagMatch });
  }, [updateFilters]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    router.replace('/negotiation/owner/list', { scroll: false });
  }, [router]);

  useEffect(() => {
    setFilters(filtersFromSearchParams(searchParams));
  }, [searchParams]);

  return {
    filters,
    setSearchTerm,
    toggleStatus,
    setArchivedFilter,
    setDateRange,
    setSortOption,
    setTags,
    toggleTag,
    setRecordLabel,
    setDataLabel,
    setDateField,
    toggleFulfillmentStatus,
    setTagMatch,
    resetFilters,
  };
}
