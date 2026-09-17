// drt_frontend\app\negotiation\owner\list\services\negotiationApi.ts
import fetchApi from "@/app/api/apiHelper";
import type { Negotiation } from "../types";

export interface NegotiationListResponse {
  results: Negotiation[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface NegotiationFilters {
  page?: number;
  pageSize?: number;
  status?: string[];
  archived?: "all" | "archived" | "active";
  startDate?: string;
  endDate?: string;
  tags?: string[];
  recordLabel?: string[];
  dataLabel?: string[];
  search?: string;
  sort?: string;
  dateField?: "created" | "decided";
  fulfillmentStatus?: string[];
}

export async function fetchNegotiations(
  filters: NegotiationFilters = {}
): Promise<NegotiationListResponse> {
  const {
    page = 1,
    pageSize = 10,
    status,
    archived,
    startDate,
    endDate,
    tags,
    recordLabel,
    dataLabel,
    search,
    sort,
    dateField,
    fulfillmentStatus,
  } = filters;

  const searchParams = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    lightweight: "true",
  });

  // Add filter params
  if (status && status.length > 0) {
    status.forEach((s) => searchParams.append("status", s));
  }
  if (archived && archived !== "all") {
    searchParams.set("archived", archived);
  }
  if (startDate) {
    searchParams.set("startDate", startDate);
  }
  if (endDate) {
    searchParams.set("endDate", endDate);
  }
  if (tags && tags.length > 0) {
    tags.forEach((t) => searchParams.append("tags", t));
  }
  if (recordLabel && recordLabel.length > 0) {
    recordLabel.forEach((r) => searchParams.append("record_label", r));
  }
  if (dataLabel && dataLabel.length > 0) {
    dataLabel.forEach((label) => searchParams.append("data_label", label));
  }
  if (search) {
    searchParams.set("search", search);
  }
  if (sort) {
    searchParams.set("sort", sort);
  }
  if (dateField && dateField !== "created") {
    searchParams.set("dateField", dateField);
  }
  if (fulfillmentStatus && fulfillmentStatus.length > 0) {
    fulfillmentStatus.forEach((value) =>
      searchParams.append("fulfillment_status", value)
    );
  }

  const res = await fetchApi(`/drt/negotiations/?${searchParams.toString()}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function archiveNegotiation(id: string): Promise<void> {
  const res = await fetchApi(`/drt/negotiations/archive/${id}/`);
  if (!res.ok) throw new Error(res.statusText);
}

export async function deleteNegotiation(id: string): Promise<void> {
  const res = await fetchApi(`/drt/negotiations/delete/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(res.statusText);
}

export async function regenerateLicense(negotiationId: string): Promise<Blob> {
  const res = await fetchApi(`/drt/negotiations/regenerate-license/${negotiationId}/`);
  if (!res.ok) throw new Error(res.statusText);
  return res.blob();
}

export async function reopenNegotiation(id: string): Promise<void> {
  const res = await fetchApi(`/drt/negotiations/reopen/${id}/`);
  if (!res.ok) throw new Error(res.statusText);
}

export type FulfillmentActionResponse = {
  message: string;
  fulfillment_status: string;
  fulfillment_note: string | null;
  fulfillment_at: string | null;
};

async function postFulfillmentAction(
  path: string,
  note?: string
): Promise<FulfillmentActionResponse> {
  const res = await fetchApi(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note ? { note } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText);
  }
  return data as FulfillmentActionResponse;
}

export async function markFulfillmentDelivered(
  negotiationId: string,
  note?: string
): Promise<FulfillmentActionResponse> {
  return postFulfillmentAction(
    `/drt/negotiations/fulfillment/deliver/${negotiationId}/`,
    note
  );
}

export async function markFulfillmentWithdrawn(
  negotiationId: string,
  note?: string
): Promise<FulfillmentActionResponse> {
  return postFulfillmentAction(
    `/drt/negotiations/fulfillment/withdraw/${negotiationId}/`,
    note
  );
}

export async function fetchNegotiationByOwnerLink(
  ownerLink: string
): Promise<Negotiation | null> {
  const searchParams = new URLSearchParams({
    owner_link: ownerLink,
    lightweight: "true",
    page_size: "1",
  });
  const res = await fetchApi(`/drt/negotiations/?${searchParams.toString()}`);
  if (!res.ok) throw new Error(res.statusText);
  const payload = await res.json();
  const results = Array.isArray(payload?.results) ? payload.results : payload;
  return results?.[0] ?? null;
}