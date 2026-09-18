import { useQuery } from "@tanstack/react-query";
import {
  fetchNegotiationFacets,
  type FacetValue,
  type NegotiationFacetsResponse,
} from "../services/facetsApi";

const EMPTY_FACETS: NegotiationFacetsResponse = {
  tags: [],
  record_labels: [],
  data_labels: [],
};

export function facetOptionValues(
  facets: FacetValue[],
  selected: string[] = []
): string[] {
  const values = facets.map((facet) => facet.value);
  const known = new Set(values);
  for (const extra of selected) {
    if (extra && !known.has(extra)) {
      values.push(extra);
    }
  }
  return values;
}

export function useNegotiationFacets() {
  const { data, error, isLoading, refetch } = useQuery<
    NegotiationFacetsResponse,
    Error
  >({
    queryKey: ["negotiation-facets"],
    queryFn: fetchNegotiationFacets,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });

  const facets = data ?? EMPTY_FACETS;

  return {
    tags: facets.tags,
    recordLabels: facets.record_labels,
    dataLabels: facets.data_labels,
    error: error?.message ?? null,
    isLoading,
    reload: refetch,
  };
}
