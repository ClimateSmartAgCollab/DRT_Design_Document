// drt_frontend/app/negotiation/(requestor)/list/hooks/useNegotiations.ts

import { useQuery } from "@tanstack/react-query";
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
    staleTime: 1000 * 60 * 5, 
    refetchInterval: 1000 * 30, 
    refetchIntervalInBackground: true, 
    refetchOnWindowFocus: true, 
    refetchOnMount: true, 
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
