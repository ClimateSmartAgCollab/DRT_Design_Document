import type { QueryClient } from "@tanstack/react-query";

export const LIVE_STATUS_QUERY = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

export function invalidateLiveStatus(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["negotiations"] });
  queryClient.invalidateQueries({ queryKey: ["owner", "summary-statistics"] });
  queryClient.invalidateQueries({ queryKey: ["ownerReview"] });
  queryClient.invalidateQueries({ queryKey: ["negotiationHistory"] });
}
