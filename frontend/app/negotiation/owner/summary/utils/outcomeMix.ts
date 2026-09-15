import type { ChartData } from "chart.js";

export type OutcomeMixRow = {
  visible_label?: string;
  data_label: string;
  record_label?: string;
  accepted_requests?: number;
  rejected_requests?: number;
  abandoned_requests?: number;
  owner_open?: number;
  requestor_open?: number;
};

const MIX_COLORS = {
  accepted: "rgb(70, 160, 35)",
  rejected: "rgb(185, 28, 28)",
  abandoned: "rgb(120, 113, 108)",
  stillOpen: "rgb(100, 116, 139)",
} as const;

export function summaryRowLabel(row: {
  visible_label?: string;
  data_label: string;
  record_label?: string;
}): string {
  const visible = row.visible_label?.trim();
  if (visible) {
    return visible;
  }
  return `${row.data_label} - ${row.record_label || "All"}`;
}

export function buildOutcomeMixChartData(rows: OutcomeMixRow[]): ChartData<"bar"> {
  return {
    labels: rows.map(summaryRowLabel),
    datasets: [
      {
        label: "Accepted",
        data: rows.map((row) => row.accepted_requests || 0),
        backgroundColor: MIX_COLORS.accepted,
      },
      {
        label: "Rejected",
        data: rows.map((row) => row.rejected_requests || 0),
        backgroundColor: MIX_COLORS.rejected,
      },
      {
        label: "Abandoned",
        data: rows.map((row) => row.abandoned_requests || 0),
        backgroundColor: MIX_COLORS.abandoned,
      },
      {
        label: "Still open",
        data: rows.map(
          (row) => (row.owner_open || 0) + (row.requestor_open || 0)
        ),
        backgroundColor: MIX_COLORS.stillOpen,
      },
    ],
  };
}
