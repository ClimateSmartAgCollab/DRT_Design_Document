// drt_frontend/app/negotiation/owner/list/hooks/useNegotiations.ts
import { useQuery } from "@tanstack/react-query";
import { LIVE_STATUS_QUERY } from "@/app/lib/liveQuery";
import { fetchNegotiations, type NegotiationListResponse, type NegotiationFilters } from "../services/negotiationApi";

export function useNegotiations(filters: NegotiationFilters = {}) {
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<NegotiationListResponse, Error>({
    queryKey: ["negotiations", filters],
    queryFn: () => fetchNegotiations(filters),
    ...LIVE_STATUS_QUERY,
    retry: 2,
  });

  return {
    data: data?.results ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? filters.page ?? 1,
    pageSize: data?.page_size ?? filters.pageSize ?? 10,
    totalPages: data?.total_pages ?? 1,
    error: error?.message ?? null,
    isLoading,
    isFetching,
    reload: refetch,
  };
}
