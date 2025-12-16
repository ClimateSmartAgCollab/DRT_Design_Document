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
  search?: string;
  sort?: string;
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
    search,
    sort,
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
  if (search) {
    searchParams.set("search", search);
  }
  if (sort) {
    searchParams.set("sort", sort);
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
  const res = await fetchApi(`/drt/negotiations/delete/${id}/`);
  if (!res.ok) throw new Error(res.statusText);
}

export async function deleteOldNegotiations(): Promise<void> {
  const res = await fetchApi("/drt/negotiations/delete_old/");
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