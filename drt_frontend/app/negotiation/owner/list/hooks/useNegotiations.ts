// drt_frontend/app/negotiation/owner/list/hooks/useNegotiations.ts
import { useQuery } from "@tanstack/react-query";
import { fetchNegotiations } from "../services/negotiationApi";
import type { Negotiation } from "../types";

export function useNegotiations() {
  const {
    data = [],
    error,
    isLoading,
    refetch,
  } = useQuery<Negotiation[], Error>({
    queryKey: ["negotiations"],
    queryFn: fetchNegotiations,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  });

  return {
    data,
    error: error?.message ?? null,
    isLoading,
    reload: refetch,
  };
}
