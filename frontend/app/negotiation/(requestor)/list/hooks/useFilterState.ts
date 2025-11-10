import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Status, ArchivedFilter, SortOption } from '../types';
import { useDebounce } from './useDebounce';
import { 
  parseStatusFilter, 
  parseArchivedFilter, 
  parseSortOption, 
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
}

const DEFAULT_FILTERS: FilterState = {
  searchTerm: '',
  statusFilter: [],
  archivedFilter: 'all',
  startDate: '',
  endDate: '',
  sortOption: 'created_desc',
};

export function useFilterState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state from URL params
  const [filters, setFilters] = useState<FilterState>(() => {
    const searchTerm = searchParams.get('search') || '';
    const statusFilter = parseStatusFilter(searchParams.get('status'));
    const archivedFilter = parseArchivedFilter(searchParams.get('archived'));
    const startDate = validateDate(searchParams.get('startDate') || '') 
      ? searchParams.get('startDate') || '' 
      : '';
    const endDate = validateDate(searchParams.get('endDate') || '') 
      ? searchParams.get('endDate') || '' 
      : '';
    const sortOption = parseSortOption(searchParams.get('sort'));
    
    return {
      searchTerm,
      statusFilter,
      archivedFilter,
      startDate,
      endDate,
      sortOption,
    };
  });

  // Debounce search term for URL updates
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

  // Update URL when filters change
  const updateURL = useCallback((newFilters: FilterState) => {
    const params: Record<string, string | string[]> = {};
    
    if (newFilters.searchTerm) params.search = newFilters.searchTerm;
    if (newFilters.statusFilter.length > 0) params.status = newFilters.statusFilter;
    if (newFilters.archivedFilter !== 'all') params.archived = newFilters.archivedFilter;
    if (newFilters.startDate) params.startDate = newFilters.startDate;
    if (newFilters.endDate) params.endDate = newFilters.endDate;
    if (newFilters.sortOption !== 'created_desc') params.sort = newFilters.sortOption;
    
    const queryString = buildQueryString(params);
    const newURL = queryString ? `?${queryString}` : '';
    
    router.replace(`/negotiation/list${newURL}`, { scroll: false });
  }, [router]);

  // Update URL when debounced search term changes
  useEffect(() => {
    const newFilters = { ...filters, searchTerm: debouncedSearchTerm };
    updateURL(newFilters);
  }, [debouncedSearchTerm, updateURL]);

  // Update filters (without URL update for search term)
  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    
    // Update URL immediately for non-search filters
    if (!updates.hasOwnProperty('searchTerm')) {
      updateURL(newFilters);
    }
  }, [filters, updateURL]);

  // Individual filter handlers
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
    // Validate date before updating
    if (value && !validateDate(value)) return;
    
    updateFilters({
      startDate: field === 'start' ? value : filters.startDate,
      endDate: field === 'end' ? value : filters.endDate,
    });
  }, [filters.startDate, filters.endDate, updateFilters]);

  const setSortOption = useCallback((sortOption: SortOption) => {
    updateFilters({ sortOption });
  }, [updateFilters]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    router.replace('/negotiation/list', { scroll: false });
  }, [router]);

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const searchTerm = searchParams.get('search') || '';
    const statusFilter = parseStatusFilter(searchParams.get('status'));
    const archivedFilter = parseArchivedFilter(searchParams.get('archived'));
    const startDate = validateDate(searchParams.get('startDate') || '') 
      ? searchParams.get('startDate') || '' 
      : '';
    const endDate = validateDate(searchParams.get('endDate') || '') 
      ? searchParams.get('endDate') || '' 
      : '';
    const sortOption = parseSortOption(searchParams.get('sort'));
    
    setFilters({
      searchTerm,
      statusFilter,
      archivedFilter,
      startDate,
      endDate,
      sortOption,
    });
  }, [searchParams]);

  return {
    filters,
    setSearchTerm,
    toggleStatus,
    setArchivedFilter,
    setDateRange,
    setSortOption,
    resetFilters,
  };
} 