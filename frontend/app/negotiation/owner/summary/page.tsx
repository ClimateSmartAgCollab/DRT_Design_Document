// drt_frontend/app/negotiation/owner/summary/page.tsx

"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import { Bar } from "react-chartjs-2";
import Header from "@/app/components/Header";
import "chart.js/auto";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { SummarySidebar } from "./components/SummarySidebar";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

const CHART_DATASETS = [
  { label: "Accepted", key: "accepted_requests" as const },
  { label: "Rejected", key: "rejected_requests" as const },
  { label: "Req. Open", key: "requestor_open" as const },
  { label: "Own. Open", key: "owner_open" as const },
  { label: "Abandoned", key: "abandoned_requests" as const },
  { label: "Archived", key: "archived_requests" as const },
];

const TABLE_HEADERS = [
  "Record Label",
  "Data Label",
  "Visible Label",
  "Dataset ID",
  "Total",
  "Accepted",
  "Rejected",
  "Req. Open",
  "Own. Open",
  "Abandoned",
  "Archived",
  "Canceled",
  "Activity & Dates",
];

async function fetchSummaryStats(
  tags?: string[],
  dataLabels?: string[],
  recordLabels?: string[],
  includeAllTags?: boolean,
  startDate?: string,
  endDate?: string,
  groupBy?: boolean
): Promise<SummaryStat[]> {
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
  return json.summary_statistics as SummaryStat[];
}

function rowLabel(row: SummaryStat): string {
  const visible = row.visible_label?.trim();
  if (visible) {
    return visible;
  }
  return `${row.data_label} - ${row.record_label || "All"}`;
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

function ActivityDatesCell({
  lastActivity,
  lastUpdated,
  dateRange,
}: {
  lastActivity?: string | null;
  lastUpdated: string;
  dateRange?: { min_date: string | null; max_date: string | null };
}) {
  const dateRangeDisplay =
    dateRange && dateRange.min_date && dateRange.max_date
      ? dateRange.min_date === dateRange.max_date
        ? { single: true, date: new Date(dateRange.min_date).toLocaleDateString() }
        : {
            single: false,
            first: new Date(dateRange.min_date).toLocaleDateString(),
            last: new Date(dateRange.max_date).toLocaleDateString(),
          }
      : null;
  const lastActivityText = lastActivity
    ? new Date(lastActivity).toLocaleString()
    : null;

  return (
    <div className="space-y-2">
      {lastActivityText ? (
        <>
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Last activity
            </div>
            <div className="text-sm text-gray-900">{lastActivityText}</div>
          </div>
          {dateRangeDisplay && (
            <div className="pt-2 border-t border-gray-200">
              {dateRangeDisplay.single ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Request created
                  </div>
                  <div className="text-xs text-gray-700">{dateRangeDisplay.date}</div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Request created
                  </div>
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <div>
                      <span className="text-gray-500">First:</span> {dateRangeDisplay.first}
                    </div>
                    <div>
                      <span className="text-gray-500">Last:</span> {dateRangeDisplay.last}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-600">
          {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
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

  const summaryQuery = useQuery<SummaryStat[], Error>({
    queryKey: ["owner", "summary-statistics", tag, dataLabel, recordLabel, startDate, endDate],
    queryFn: () =>
      fetchSummaryStats(
        tag,
        dataLabel.length > 0 ? dataLabel : undefined,
        recordLabel.length > 0 ? recordLabel : undefined,
        false,
        startDate || undefined,
        endDate || undefined,
        true
      ),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: !!whoamiQuery.data,
  });

  const allStatsQuery = useQuery<SummaryStat[], Error>({
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
    return summaryQuery.data ?? [];
  }, [summaryQuery.data, hasNoDataError]);
  const allStatsForOptions = useMemo(
    () => allStatsQuery.data ?? [],
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

  const chartData = useMemo(
    () => ({
      labels: groupedData.map(rowLabel),
      datasets: CHART_DATASETS.map((dataset) => ({
        label: dataset.label,
        data: groupedData.map((d) => d[dataset.key] || 0),
      })),
    }),
    [groupedData]
  );

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
                  onReset={() => {
                    setDataLabel([]);
                    setTag([]);
                    setRecordLabel([]);
                    setStartDate("");
                    setEndDate("");
                  }}
                />
              </aside>

              <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Summary Statistics</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    These figures are decisions on requests, not file access.
                  </p>
                </div>

                <section className="bg-white p-4 rounded shadow">
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top" },
                        title: { display: true, text: "Request outcomes" },
                      },
                    }}
                  />
                </section>

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
                        <li key={`invalid-${rowLabel(row)}-${idx}`}>
                          {rowLabel(row)}
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

                <section className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr className="bg-gray-100">
                        {TABLE_HEADERS.map((header) => (
                          <th key={header} className="border px-4 py-2">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={TABLE_HEADERS.length}
                            className="border px-4 py-8 text-center text-gray-500"
                          >
                            No data available
                          </td>
                        </tr>
                      ) : (
                        groupedData.map((d, idx) => {
                          const tagsList = splitTags(d.tag);
                          const invalid = Boolean(
                            d.validation_status && !d.validation_status.is_valid
                          );
                          return (
                            <tr
                              key={`record-${d.dataset_ID}-${d.record_label}-${d.data_label}-${idx}`}
                              className={invalid ? "bg-red-50" : undefined}
                            >
                              <td className="border px-4 py-2">
                                <div>{d.record_label || "All"}</div>
                                {tagsList.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {tagsList.map((t) => (
                                      <span
                                        key={t}
                                        className="inline-block bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] text-xs font-medium px-2 py-1 rounded"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="border px-4 py-2">{d.data_label}</td>
                              <td className="border px-4 py-2">{d.visible_label || "—"}</td>
                              <td className="border px-4 py-2 font-mono text-xs">
                                {d.dataset_ID || "—"}
                              </td>
                              <td className="border px-4 py-2">{d.total_requests}</td>
                              <td className="border px-4 py-2">{d.accepted_requests}</td>
                              <td className="border px-4 py-2">{d.rejected_requests}</td>
                              <td className="border px-4 py-2">{d.requestor_open}</td>
                              <td className="border px-4 py-2">{d.owner_open}</td>
                              <td className="border px-4 py-2">{d.abandoned_requests || 0}</td>
                              <td className="border px-4 py-2">{d.archived_requests || 0}</td>
                              <td className="border px-4 py-2">{d.canceled_requests || 0}</td>
                              <td className="border px-4 py-2">
                                <ActivityDatesCell
                                  lastActivity={d.last_activity}
                                  lastUpdated={d.last_updated || d.generated_at}
                                  dateRange={d.negotiation_date_range}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </Providers>
  );
}
