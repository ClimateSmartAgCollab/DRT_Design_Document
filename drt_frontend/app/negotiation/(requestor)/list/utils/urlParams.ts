import { Status, ArchivedFilter, SortOption, ALL_STATUSES } from '../types';

export function parseStatusFilter(statusParam: string | null): Status[] {
  if (!statusParam) return [];
  
  const statuses = statusParam.split(',').filter(Boolean);
  return statuses.filter((status): status is Status => 
    ALL_STATUSES.includes(status as Status)
  );
}

export function parseArchivedFilter(archivedParam: string | null): ArchivedFilter {
  if (!archivedParam) return 'all';
  
  const validOptions: ArchivedFilter[] = ['all', 'archived', 'active'];
  return validOptions.includes(archivedParam as ArchivedFilter) 
    ? archivedParam as ArchivedFilter 
    : 'all';
}

export function parseSortOption(sortParam: string | null): SortOption {
  if (!sortParam) return 'created_desc';
  
  const validOptions: SortOption[] = [
    'created_asc',
    'created_desc', 
    'status_asc',
    'status_desc'
  ];
  
  return validOptions.includes(sortParam as SortOption)
    ? sortParam as SortOption
    : 'created_desc';
}

export function validateDate(dateString: string): boolean {
  if (!dateString) return true;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function buildQueryString(params: Record<string, string | string[]>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        searchParams.set(key, value.join(','));
      }
    } else if (value) {
      searchParams.set(key, value);
    }
  });
  
  return searchParams.toString();
} 