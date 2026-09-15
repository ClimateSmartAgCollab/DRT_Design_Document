export type SummaryKpiSource = {
  owner_open?: number;
  requestor_open?: number;
  accepted_requests?: number;
  rejected_requests?: number;
  abandoned_requests?: number;
};

export type ClickableKpiId =
  | "waitingOnYou"
  | "waitingOnRequestor"
  | "decided"
  | "abandoned";

export type SummaryKpis = {
  waitingOnYou: number;
  waitingOnRequestor: number;
  decided: number;
  abandoned: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number | null;
};

export const KPI_LIST_STATUS: Record<ClickableKpiId, string[]> = {
  waitingOnYou: ["owner_open"],
  waitingOnRequestor: ["requestor_open"],
  decided: ["accepted", "rejected"],
  abandoned: ["abandoned"],
};

export function summarizeKpis(rows: SummaryKpiSource[]): SummaryKpis {
  const waitingOnYou = rows.reduce((sum, row) => sum + (row.owner_open || 0), 0);
  const waitingOnRequestor = rows.reduce(
    (sum, row) => sum + (row.requestor_open || 0),
    0
  );
  const accepted = rows.reduce((sum, row) => sum + (row.accepted_requests || 0), 0);
  const rejected = rows.reduce((sum, row) => sum + (row.rejected_requests || 0), 0);
  const abandoned = rows.reduce(
    (sum, row) => sum + (row.abandoned_requests || 0),
    0
  );
  const decided = accepted + rejected;

  return {
    waitingOnYou,
    waitingOnRequestor,
    decided,
    abandoned,
    accepted,
    rejected,
    acceptanceRate: decided === 0 ? null : accepted / decided,
  };
}

export function decidedWindowLabel(startDate?: string, endDate?: string): string {
  return startDate || endDate ? "Request created in window" : "Lifetime";
}

export function formatAcceptanceRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
