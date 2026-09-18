import fetchApi from "@/app/api/apiHelper";

export type FacetValue = {
  value: string;
  count: number;
};

export type NegotiationFacetsResponse = {
  tags: FacetValue[];
  record_labels: FacetValue[];
  data_labels: FacetValue[];
};

export async function fetchNegotiationFacets(): Promise<NegotiationFacetsResponse> {
  const res = await fetchApi("/drt/negotiations/facets/");
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}
