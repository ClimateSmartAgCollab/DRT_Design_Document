// drt_frontend\app\negotiation\owner\list\services\negotiationApi.ts
import fetchApi from "@/app/api/apiHelper";
import type { Negotiation } from "../types";

export async function fetchNegotiations(): Promise<Negotiation[]> {
  const res = await fetchApi("/drt/negotiations/");
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