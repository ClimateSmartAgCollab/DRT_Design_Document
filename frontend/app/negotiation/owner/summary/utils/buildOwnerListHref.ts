export type OwnerListHrefFilters = {
  status?: string[];
  tags?: string[];
  recordLabel?: string[];
  dataLabel?: string[];
  startDate?: string;
  endDate?: string;
  dateField?: "created" | "decided";
  fulfillmentStatus?: string[];
};

export const TABLE_COUNT_STATUS = {
  accepted: ["accepted"],
  rejected: ["rejected"],
  requestor_open: ["requestor_open"],
  owner_open: ["owner_open"],
  abandoned: ["abandoned"],
} as const;

function setCsvParam(
  params: URLSearchParams,
  key: string,
  values?: string[]
) {
  const cleaned = (values ?? []).map((value) => value.trim()).filter(Boolean);
  if (cleaned.length > 0) {
    params.set(key, cleaned.join(","));
  }
}

export function buildOwnerListHref(filters: OwnerListHrefFilters): string {
  const params = new URLSearchParams();
  setCsvParam(params, "status", filters.status);
  setCsvParam(params, "tags", filters.tags);
  setCsvParam(params, "record_label", filters.recordLabel);
  setCsvParam(params, "data_label", filters.dataLabel);
  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }
  if (filters.dateField && filters.dateField !== "created") {
    params.set("dateField", filters.dateField);
  }
  setCsvParam(params, "fulfillment_status", filters.fulfillmentStatus);
  const query = params.toString();
  return query ? `/negotiation/owner/list?${query}` : "/negotiation/owner/list";
}

/** Drill into one summary row: that group's labels, current tag/date window. */
export function filtersForSummaryRow(args: {
  recordLabel?: string;
  dataLabel?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  dateField?: "created" | "decided";
  status?: string[];
}): OwnerListHrefFilters {
  return {
    status: args.status,
    tags: args.tags,
    recordLabel: args.recordLabel?.trim() ? [args.recordLabel.trim()] : undefined,
    dataLabel: args.dataLabel?.trim() ? [args.dataLabel.trim()] : undefined,
    startDate: args.startDate,
    endDate: args.endDate,
    dateField: args.dateField,
  };
}
