import fetchApi from "@/app/api/apiHelper";
import { NegotiationData, NegotiationHistory } from "../types";

export async function fetchNegotiation(
  link_id: string
): Promise<NegotiationData> {
  const res = await fetchApi(`/drt/owner_review/${link_id}/`);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to load negotiation");
  return data;
}

export async function fetchNegotiationHistory(
  linkId: string
): Promise<NegotiationHistory> {
  const negotiationsRes = await fetchApi("/drt/negotiations/");
  if (!negotiationsRes.ok) throw new Error("Failed to load negotiations");
  const negotiations = await negotiationsRes.json();

  const negotiation = negotiations.find((n: any) => n.owner_link === linkId);
  if (!negotiation) {
    throw new Error("Negotiation not found");
  }

  const historyRes = await fetchApi(
    `/drt/negotiations/${negotiation.negotiation_id}/history/`
  );
  if (!historyRes.ok) throw new Error("Failed to load negotiation history");
  const raw = await historyRes.json();

  let archive_history: any[] | undefined = raw.archive_history;
  if (!archive_history && Array.isArray(raw.version_history)) {
    archive_history = raw.version_history.map((v: any, idx: number) => ({
      entry_number: idx + 1,
      timestamp: v.timestamp,
      changed_by: v.changed_by,
      change_description: v.change_description,
      state: v.state,
      requestor_responses: v.requestor_responses ?? null,
      owner_responses: v.owner_responses ?? null,
      comments: v.comments ?? null,
    }));
  }

  return {
    ...raw,
    archive_history,
  } as NegotiationHistory;
}

export async function performAction(
  linkId: string,
  action: string,
  fieldComments: Record<string, string>,
  globalComments: string,
  extras: Record<string, string> = {}
): Promise<any> {
  const formData = new FormData();
  const ownerResponsesJson = JSON.stringify(fieldComments);
  
  // Store field comments in the global comments field as a workaround
  const fieldCommentsText = Object.entries(fieldComments)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `Field ${key}: ${value}`)
    .join('\n');
  
  const combinedComments = globalComments + (fieldCommentsText ? `\n\nField Comments:\n${fieldCommentsText}` : '');
  
  formData.append("owner_responses", ownerResponsesJson);
  formData.append("comments", combinedComments);
  formData.append(action, "true");
  
  // Add additional fields that might trigger archive creation
  formData.append("create_archive_entry", "true");
  formData.append("change_description", `Owner ${action}ed the request`);
  
  Object.entries(extras).forEach(([k, v]) => formData.append(k, v));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

  try {
    const res = await fetchApi(`/drt/owner_review/${linkId}/`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Action failed");
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  }
}

export async function sendVerificationEmail(email: string): Promise<void> {
  const currentUrl = window.location.href;
  console.log("Sending verification email with target URL:", currentUrl);

  const res = await fetchApi("/drt/verify/owner-email/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      target_url: currentUrl,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to send verification email");
  }
}

export async function checkUserAuth(): Promise<boolean> {
  try {
    const res = await fetchApi("/drt/owner/whoami/");
    return res.ok;
  } catch {
    return false;
  }
}
