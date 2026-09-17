export type DateField = "created" | "decided";

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

export function decidedWindowLabel(
  startDate?: string,
  endDate?: string,
  dateField: DateField = "created"
): string {
  if (!(startDate || endDate)) return "Lifetime";
  return dateField === "decided"
    ? "Decided in window"
    : "Request created in window";
}

export function formatAcceptanceRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatDurationSeconds(
  seconds: number | null | undefined,
  sampleSize: number
): string {
  if (sampleSize <= 0 || seconds == null) return "—";
  const total = Math.max(0, Math.round(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

export type SummaryClocks = {
  date_field: DateField;
  median_time_to_first_look_seconds: number | null;
  median_time_to_decision_seconds: number | null;
  first_look_sample_size: number;
  decision_sample_size: number;
};

export const EMPTY_CLOCKS: SummaryClocks = {
  date_field: "created",
  median_time_to_first_look_seconds: null,
  median_time_to_decision_seconds: null,
  first_look_sample_size: 0,
  decision_sample_size: 0,
};

export type FulfillmentKpiId = "pending" | "delivered" | "withdrawn";

export type SummaryFulfillment = Record<FulfillmentKpiId, number>;

export const EMPTY_FULFILLMENT: SummaryFulfillment = {
  pending: 0,
  delivered: 0,
  withdrawn: 0,
};

export const FULFILLMENT_LIST_STATUS: Record<FulfillmentKpiId, string[]> = {
  pending: ["pending"],
  delivered: ["delivered"],
  withdrawn: ["withdrawn"],
};

export function parseSummaryFulfillment(raw: unknown): SummaryFulfillment {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const toCount = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return {
    pending: toCount(source.pending),
    delivered: toCount(source.delivered),
    withdrawn: toCount(source.withdrawn),
  };
}
