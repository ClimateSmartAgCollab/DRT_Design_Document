// drt_frontend/app/negotiation/owner/summary/page.tsx

"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import Header from "@/app/components/Header";
import { SummarySidebar } from "./components/SummarySidebar";
import { KpiStrip } from "./components/KpiStrip";
import { OutcomeMixChart } from "./components/OutcomeMixChart";
import { SummaryResultsTable } from "./components/SummaryResultsTable";
import { summaryRowLabel } from "./utils/outcomeMix";
import {
  EMPTY_CLOCKS,
  EMPTY_FULFILLMENT,
  parseSummaryFulfillment,
  type DateField,
  type SummaryClocks,
  type SummaryFulfillment,
} from "./utils/summaryKpis";

interface SummaryStat {
  dataset_ID?: string;
  visible_label?: string;
  data_label: string;
  tag: string;
  record_label?: string;
  total_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  requestor_open: number;
  owner_open: number;
  abandoned_requests: number;
  archived_requests: number;
  canceled_requests?: number;
  generated_at: string;
  last_updated?: string;
  last_activity?: string | null;
  negotiation_date_range?: {
    min_date: string | null;
    max_date: string | null;
  };
  validation_status?: {
    is_valid: boolean;
    message: string | null;
    difference?: number;
  };
}

async function fetchSummaryStats(
  tags?: string[],
  dataLabels?: string[],
  recordLabels?: string[],
  includeAllTags?: boolean,
  startDate?: string,
  endDate?: string,
  groupBy?: boolean,
  dateField?: DateField
): Promise<{ rows: SummaryStat[]; clocks: SummaryClocks; fulfillment: SummaryFulfillment }> {
  const params = new URLSearchParams();
  if (tags && tags.length > 0) {
    tags.forEach((tag) => params.append("tags", tag));
  }
  if (dataLabels && dataLabels.length > 0) {
    dataLabels.forEach((lbl) => params.append("data_label", lbl));
  }
  if (recordLabels && recordLabels.length > 0) {
    recordLabels.forEach((rl) => params.append("record_label", rl));
  }
  if (includeAllTags) {
    params.set("include_all_tags", "true");
  }
  if (startDate) {
    params.set("startDate", startDate);
  }
  if (endDate) {
    params.set("endDate", endDate);
  }
  if (dateField && dateField !== "created") {
    params.set("dateField", dateField);
  }
  if (groupBy) {
    params.set("group_by", "true");
  }

  const queryString = params.toString();
  const url = queryString
    ? `/drt/summary-statistics/?${queryString}`
    : "/drt/summary-statistics/";

  const res = await fetchApi(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Status ${res.status}`);
  }
  return {
    rows: (json.summary_statistics || []) as SummaryStat[],
    clocks: json.clocks
      ? {
          date_field: json.clocks.date_field === "decided" ? "decided" : "created",
          median_time_to_first_look_seconds:
            json.clocks.median_time_to_first_look_seconds ?? null,
          median_time_to_decision_seconds:
            json.clocks.median_time_to_decision_seconds ?? null,
          first_look_sample_size: json.clocks.first_look_sample_size || 0,
          decision_sample_size: json.clocks.decision_sample_size || 0,
        }
      : EMPTY_CLOCKS,
    fulfillment: parseSummaryFulfillment(json.fulfillment),
  };
}

function splitTags(tag: string | undefined): string[] {
  if (!tag || !tag.trim()) return [];
  return tag.split(",").map((t) => t.trim()).filter(Boolean);
}

function sortKey(item: SummaryStat): number {
  if (item.last_activity) {
    return new Date(item.last_activity).getTime();
  }
  if (item.last_updated) {
    return new Date(item.last_updated).getTime();
  }
  if (item.negotiation_date_range?.max_date) {
    return new Date(item.negotiation_date_range.max_date).getTime();
  }
  return 0;
}

export default function OwnerSummaryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const whoamiQuery = useQuery({
    queryKey: ["owner", "whoami"],
    queryFn: async () => {
      const res = await fetchApi("/drt/owner/whoami/");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });
  React.useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi("/drt/owner/logout/", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      router.push("/negotiation/owner/email-entry");
    },
    onError: (error) => {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      router.push("/negotiation/owner/email-entry");
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };

  const [dataLabel, setDataLabel] = useState<string[]>([]);
  const [tag, setTag] = useState<string[]>([]);
  const [recordLabel, setRecordLabel] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateField, setDateField] = useState<DateField>("created");

  const summaryQuery = useQuery<{ rows: SummaryStat[]; clocks: SummaryClocks; fulfillment: SummaryFulfillment }, Error>({
    queryKey: [
      "owner",
      "summary-statistics",
      tag,
      dataLabel,
      recordLabel,
      startDate,
      endDate,
      dateField,
    ],
    queryFn: () =>
      fetchSummaryStats(
        tag,
        dataLabel.length > 0 ? dataLabel : undefined,
        recordLabel.length > 0 ? recordLabel : undefined,
        false,
        startDate || undefined,
        endDate || undefined,
        true,
        dateField
      ),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: !!whoamiQuery.data,
  });

  const allStatsQuery = useQuery<{ rows: SummaryStat[]; clocks: SummaryClocks; fulfillment: SummaryFulfillment }, Error>({
    queryKey: ["owner", "summary-statistics", "all", "options"],
    queryFn: () => fetchSummaryStats(undefined, undefined, undefined, true),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: !!whoamiQuery.data,
  });

  const hasNoDataError =
    summaryQuery.isError &&
    summaryQuery.error?.message?.toLowerCase().includes("no summary statistics found");

  const allData = useMemo(() => {
    if (hasNoDataError) return [];
    return summaryQuery.data?.rows ?? [];
  }, [summaryQuery.data, hasNoDataError]);
  const clocks = summaryQuery.data?.clocks ?? EMPTY_CLOCKS;
  const fulfillment = summaryQuery.data?.fulfillment ?? EMPTY_FULFILLMENT;
  const allStatsForOptions = useMemo(
    () => allStatsQuery.data?.rows ?? [],
    [allStatsQuery.data]
  );

  const dataLabelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allStatsForOptions
            .map((d) => d.data_label)
            .filter((dl): dl is string => Boolean(dl))
        )
      ),
    [allStatsForOptions]
  );
  const tagOptions = useMemo(() => {
    const allTags = new Set<string>();
    allStatsForOptions.forEach((d) => {
      splitTags(d.tag).forEach((t) => allTags.add(t));
    });
    return Array.from(allTags).sort();
  }, [allStatsForOptions]);
  const recordLabelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allStatsForOptions
            .map((d) =>
              typeof d.record_label === "string" && d.record_label
                ? d.record_label
                : undefined
            )
            .filter((l): l is string => typeof l === "string" && Boolean(l))
        )
      ),
    [allStatsForOptions]
  );

  const groupedData = useMemo(
    () => [...allData].sort((a, b) => sortKey(b) - sortKey(a)),
    [allData]
  );

  const invalidRows = useMemo(
    () => groupedData.filter((row) => row.validation_status && !row.validation_status.is_valid),
    [groupedData]
  );

  const asOf =
    summaryQuery.dataUpdatedAt > 0
      ? new Date(summaryQuery.dataUpdatedAt)
      : null;
  const asOfLabel =
    asOf && !Number.isNaN(asOf.getTime())
      ? { label: asOf.toLocaleString(), iso: asOf.toISOString() }
      : null;

  if (whoamiQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading owner…
      </div>
    );
  }

  if (whoamiQuery.isError || !whoamiQuery.data) {
    return null;
  }

  const headerProps = {
    title: "Summary Statistics",
    homepageLink: {
      href: "/negotiation/owner/homepage",
      onClick: () => router.push("/negotiation/owner/homepage"),
    },
    userDropdown: {
      email: whoamiQuery.data?.email || "",
      role: "owner" as const,
      isLoading: whoamiQuery.isLoading,
      isLoggingOut: isLoggingOut,
      onLogout: handleLogout,
    },
  };

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        <Header {...headerProps} />

        <div className="w-full overflow-x-hidden">
          {summaryQuery.isLoading ? (
            <div className="flex items-center justify-center min-h-screen text-gray-600">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(70,160,35)] mx-auto mb-4"></div>
                <p>Loading summary statistics…</p>
              </div>
            </div>
          ) : summaryQuery.isError && !hasNoDataError ? (
            <div className="flex items-center justify-center min-h-screen">
              <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700 max-w-2xl">
                ⚠️ {summaryQuery.error.message}
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
              <aside className="w-full lg:w-80 bg-white border-r-0 lg:border-r border-b lg:border-b-0 border-gray-200 p-4 sm:p-6">
                <SummarySidebar
                  dataLabelOptions={dataLabelOptions}
                  selectedDataLabel={dataLabel}
                  onDataLabelChange={setDataLabel}
                  tagOptions={tagOptions}
                  selectedTag={tag}
                  onTagChange={setTag}
                  recordLabelOptions={recordLabelOptions}
                  selectedRecordLabel={recordLabel}
                  onRecordLabelChange={setRecordLabel}
                  startDate={startDate}
                  endDate={endDate}
                  onDateChange={(field, v) =>
                    field === "start" ? setStartDate(v) : setEndDate(v)
                  }
                  dateField={dateField}
                  onDateFieldChange={setDateField}
                  onReset={() => {
                    setDataLabel([]);
                    setTag([]);
                    setRecordLabel([]);
                    setStartDate("");
                    setEndDate("");
                    setDateField("created");
                  }}
                />
              </aside>

              <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Summary Statistics</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    These figures are decisions on requests, not file access.
                  </p>
                  {asOfLabel && (
                    <p className="mt-1 text-xs text-gray-500" title={asOfLabel.iso}>
                      As of {asOfLabel.label}
                    </p>
                  )}
                </div>

                <KpiStrip
                  rows={groupedData}
                  tags={tag}
                  dataLabels={dataLabel}
                  recordLabels={recordLabel}
                  startDate={startDate}
                  endDate={endDate}
                  dateField={dateField}
                  clocks={clocks}
                  fulfillment={fulfillment}
                />

                <OutcomeMixChart rows={groupedData} />

                <div className="bg-[rgba(180,230,160,0.3)] border-l-4 border-[rgb(70,160,35)] p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-[rgb(70,160,35)] text-lg">ℹ️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-[rgb(55,125,28)]">
                        {tag.length > 0 ? (
                          <>
                            <strong>Tag filter (AND):</strong> Showing cases that have{" "}
                            <strong>all</strong> of the selected tags. Each row is still one
                            dataset (record label + data label), not a summed total.
                          </>
                        ) : (
                          <>
                            <strong>Record label view:</strong> Statistics are grouped by
                            dataset id, record label, and data label. No tag filtering applied.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {invalidRows.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded text-red-800">
                    <p className="text-sm font-medium">
                      Some rows failed the state-count identity check (counts do not sum to
                      Total).
                    </p>
                    <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                      {invalidRows.map((row, idx) => (
                        <li key={`invalid-${summaryRowLabel(row)}-${idx}`}>
                          {summaryRowLabel(row)}
                          {row.validation_status?.message
                            ? `: ${row.validation_status.message}`
                            : ""}
                          {typeof row.validation_status?.difference === "number"
                            ? ` (difference ${row.validation_status.difference})`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <SummaryResultsTable
                  rows={groupedData}
                  tags={tag}
                  startDate={startDate}
                  endDate={endDate}
                  dateField={dateField}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </Providers>
  );
}
