// drt_frontend/app/negotiation/(requestor)/list/hooks/useNegotiations.ts

import { useQuery } from "@tanstack/react-query";
import { LIVE_STATUS_QUERY } from "@/app/lib/liveQuery";
import { fetchNegotiations } from "../services/negotiationApi";
import type { Negotiation } from "../types";

export function useNegotiations() {
  const {
    data = [],
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Negotiation[], Error>({
    queryKey: ["negotiations"],
    queryFn: fetchNegotiations,
    ...LIVE_STATUS_QUERY,
    retry: 2,
  });

  return {
    data,
    error: error?.message ?? null,
    isLoading,
    isFetching,
    reload: refetch,
  };
}
