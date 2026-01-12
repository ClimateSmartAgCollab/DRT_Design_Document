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
  data_label: string;
  tag: string; 
  record_label?: string;
  total_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  requestor_open: number;
  owner_open: number;
  generated_at: string; 
  last_updated?: string; 
  last_activity?: string | null; 
  negotiation_date_range?: {
    min_date: string | null;
    max_date: string | null;
  };
}

async function fetchSummaryStats(
  tags?: string[], 
  dataLabel?: string, 
  recordLabels?: string[], 
  includeAllTags?: boolean,
  startDate?: string,
  endDate?: string,
  groupBy?: boolean
): Promise<SummaryStat[]> {

  const params = new URLSearchParams();
  if (tags && tags.length > 0) {
    tags.forEach(tag => params.append('tags', tag));
  }
  if (dataLabel) {
    params.set('data_label', dataLabel);
  }
  if (recordLabels && recordLabels.length > 0) {
    recordLabels.forEach(rl => params.append('record_label', rl));
  }
  if (includeAllTags) {
    params.set('include_all_tags', 'true');
  }
  if (startDate) {
    params.set('startDate', startDate);
  }
  if (endDate) {
    params.set('endDate', endDate);
  }
  if (groupBy) {
    params.set('group_by', 'true');
  }
  
  const queryString = params.toString();
  const url = queryString ? `/drt/summary-statistics/?${queryString}` : "/drt/summary-statistics/";
  
  const res = await fetchApi(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Status ${res.status}`);
  }
  return json.summary_statistics as SummaryStat[];
}

// Helper component to display activity and date information
function ActivityDatesCell({
  lastActivity,
  lastUpdated,
  dateRange,
}: {
  lastActivity?: string | null;
  lastUpdated: string;
  dateRange?: { min_date: string | null; max_date: string | null };
}) {
  const dateRangeDisplay = dateRange && dateRange.min_date && dateRange.max_date
    ? (dateRange.min_date === dateRange.max_date
        ? { single: true, date: new Date(dateRange.min_date).toLocaleDateString() }
        : { 
            single: false, 
            first: new Date(dateRange.min_date).toLocaleDateString(),
            last: new Date(dateRange.max_date).toLocaleDateString()
          })
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
              Last Modified
            </div>
            <div className="text-sm text-gray-900">
              {lastActivityText}
            </div>
          </div>
          {dateRangeDisplay && (
            <div className="pt-2 border-t border-gray-200">
              {dateRangeDisplay.single ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Created
                  </div>
                  <div className="text-xs text-gray-700">
                    {dateRangeDisplay.date}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Created
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

  // Add authentication check (like owner list page)
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
      const response = await fetchApi('/drt/owner/logout/', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/negotiation/owner/email-entry');
    },
    onError: (error) => {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      // Still redirect even if logout fails
      router.push('/negotiation/owner/email-entry');
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };

  // ——— filter state ———
  const [dataLabel, setDataLabel] = useState<string>("");
  const [tag, setTag] = useState<string[]>([]);
  const [recordLabel, setRecordLabel] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // ——— React Query: load summary stats with filters ———
  const summaryQuery = useQuery<SummaryStat[], Error>({
    queryKey: ["owner", "summary-statistics", tag, dataLabel, recordLabel, startDate, endDate],
    queryFn: () => fetchSummaryStats(
      tag, 
      dataLabel || undefined, 
      recordLabel.length > 0 ? recordLabel : undefined, 
      false,
      startDate || undefined, 
      endDate || undefined,
      true  // Request grouped data from backend
    ),
    staleTime: 1000 * 60 * 5, // 5m
    retry: 1,
    enabled: !!whoamiQuery.data, // Only fetch if authenticated
  });

  // ——— React Query: load all summary stats (unfiltered) for filter options ———
  const allStatsQuery = useQuery<SummaryStat[], Error>({
    queryKey: ["owner", "summary-statistics", "all", "options"],
    queryFn: () => fetchSummaryStats(undefined, undefined, undefined, true), 
    staleTime: 1000 * 60 * 5, 
    retry: 1,
    enabled: !!whoamiQuery.data, 
  });

  const hasNoDataError = summaryQuery.isError && 
    summaryQuery.error?.message?.toLowerCase().includes('no summary statistics found');
  
  const allData = useMemo(() => {
    if (hasNoDataError) return [];
    return summaryQuery.data ?? [];
  }, [summaryQuery.data, hasNoDataError]);
  const allStatsForOptions = useMemo(() => allStatsQuery.data ?? [], [allStatsQuery.data]);

  // ——— Derive filter options from unfiltered data ———
  const dataLabelOptions = useMemo(
    () => Array.from(new Set(allStatsForOptions.map((d) => d.data_label).filter((dl): dl is string => Boolean(dl)))),
    [allStatsForOptions]
  );
  const tagOptions = useMemo(
    () => {
      // Extract individual tags from tag field
      const allTags = new Set<string>();
      allStatsForOptions.forEach(d => {
        if (d.tag && d.tag.trim()) {
          // Handle comma-separated tags from backend
          const tags = d.tag.split(',').map(t => t.trim()).filter(t => t);
          tags.forEach(t => allTags.add(t));
        }
      });
      return Array.from(allTags).sort();
    },
    [allStatsForOptions]
  );
  const recordLabelOptions = useMemo(
    () => Array.from(new Set(allStatsForOptions.map((d) => typeof d.record_label === 'string' && d.record_label ? d.record_label : undefined).filter((l): l is string => typeof l === 'string' && Boolean(l)))),
    [allStatsForOptions]
  );

  const filteredData = useMemo(() => {
    return allData; // Backend handles date filtering via API
  }, [allData]);


  const groupedData = useMemo(() => {
    const isTagView = tag.length > 0;
    
    if (!isTagView) {
      return filteredData;
    } else {
      if (filteredData.length === 0) return [];
      
      const tagData = filteredData[0]; // Backend returns single combined row
      const tagsList = tagData.tag ? tagData.tag.split(',').map(t => t.trim()) : tag;
      
      return [{
        tags: tagsList,
        total_requests: tagData.total_requests,
        accepted_requests: tagData.accepted_requests,
        rejected_requests: tagData.rejected_requests,
        requestor_open: tagData.requestor_open,
        owner_open: tagData.owner_open,
        last_updated: tagData.last_updated || tagData.generated_at,
        last_activity: tagData.last_activity || null,
        negotiation_date_range: tagData.negotiation_date_range,
      }];
    }
  }, [filteredData, tag]);

  // Chart data
  const chartData = useMemo(
    () => {
      const isTagView = tag.length > 0;
      // Handle empty data case
      if (groupedData.length === 0) {
        return {
          labels: [],
          datasets: [
            {
              label: "Total",
              data: [],
            },
            {
              label: "Accepted",
              data: [],
            },
            {
              label: "Rejected",
              data: [],
            },
            {
              label: "Req. Open",
              data: [],
            },
            {
              label: "Own. Open",
              data: [],
            },
          ],
        };
      }
      return {
        labels: groupedData.map((d) => {
          if (isTagView) {
            // Show all selected tags as label
            return (d as any).tags.join(", ");
          } else {
            return `${(d as any).data_label} - ${(d as any).record_label || "All"}`;
          }
        }),
        datasets: [
          {
            label: "Total",
            data: groupedData.map((d) => d.total_requests),
          },
          {
            label: "Accepted",
            data: groupedData.map((d) => d.accepted_requests),
          },
          {
            label: "Rejected",
            data: groupedData.map((d) => d.rejected_requests),
          },
          {
            label: "Req. Open",
            data: groupedData.map((d) => d.requestor_open),
          },
          {
            label: "Own. Open",
            data: groupedData.map((d) => d.owner_open),
          },
        ],
      };
    },
    [groupedData, tag]
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

  // Common Header component props
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
        {/* Header Bar */}
        <Header {...headerProps} />

        <div className="w-full overflow-x-hidden">
          {summaryQuery.isLoading ? (
            <div className="flex items-center justify-center min-h-screen text-gray-600">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                  onTagChange={(v: string[]) => setTag(v)}
                  recordLabelOptions={recordLabelOptions}
                  selectedRecordLabel={recordLabel}
                  onRecordLabelChange={(v: string[]) => setRecordLabel(v)}
                  startDate={startDate}
                  endDate={endDate}
                  onDateChange={(field, v) =>
                    field === "start" ? setStartDate(v) : setEndDate(v)
                  }
                  onReset={() => {
                    setDataLabel("");
                    setTag([]);
                    setRecordLabel([]);
                    setStartDate("");
                    setEndDate("");
                  }}
                />
              </aside>

              <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
                <h1 className="text-2xl sm:text-3xl font-bold">Summary Statistics</h1>

                <section className="bg-white p-4 rounded shadow">
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top" },
                        title: { display: true, text: "Requests Overview" },
                      },
                    }}
                  />
                </section>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-blue-400 text-lg">ℹ️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        {tag.length > 0 ? (
                          <>
                            <strong>Tag-Filtered View:</strong> All selected tags are combined into a single row. 
                            Statistics from all selected tags are <strong>summed together</strong> across all data labels 
                            and record labels to show the total combined statistics.
                          </>
                        ) : (
                          <>
                            <strong>Record Label View:</strong> Statistics are grouped by record label and data label, 
                            showing all records (no tag filtering applied).
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <section className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr className="bg-gray-100">
                        {tag.length > 0 ? (
                          // Tag view headers (grouped by tag only, no data_label)
                          [
                            "Tag",
                            "Total",
                            "Accepted",
                            "Rejected",
                            "Req. Open",
                            "Own. Open",
                            "Activity & Dates",
                          ].map((header) => (
                            <th key={header} className="border px-4 py-2">
                              {header}
                            </th>
                          ))
                        ) : (
                          // Record label view headers
                          [
                            "Record Label",
                            "Data Label",
                            "Total",
                            "Accepted",
                            "Rejected",
                            "Req. Open",
                            "Own. Open",
                            "Activity & Dates",
                          ].map((header) => (
                            <th key={header} className="border px-4 py-2">
                              {header}
                            </th>
                          ))
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedData.length === 0 ? (
                        <tr>
                          <td 
                            colSpan={tag.length > 0 ? 7 : 8} 
                            className="border px-4 py-8 text-center text-gray-500"
                          >
                            No data available
                          </td>
                        </tr>
                      ) : (
                        groupedData.map((d, idx) => {
                        if (tag.length > 0) {
                          // Tag view rows
                          const tagData = d as { tags: string[]; total_requests: number; accepted_requests: number; rejected_requests: number; requestor_open: number; owner_open: number; last_updated: string; last_activity?: string | null; negotiation_date_range?: { min_date: string | null; max_date: string | null }; };
                          return (
                            <tr key={`tags-${tagData.tags.join("-")}-${idx}`}>
                              <td className="border px-4 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {tagData.tags.map((t, tagIdx) => (
                                    <span
                                      key={tagIdx}
                                      className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="border px-4 py-2">{tagData.total_requests}</td>
                              <td className="border px-4 py-2">{tagData.accepted_requests}</td>
                              <td className="border px-4 py-2">{tagData.rejected_requests}</td>
                              <td className="border px-4 py-2">{tagData.requestor_open}</td>
                              <td className="border px-4 py-2">{tagData.owner_open}</td>
                              <td className="border px-4 py-2">
                                <ActivityDatesCell
                                  lastActivity={tagData.last_activity}
                                  lastUpdated={tagData.last_updated}
                                  dateRange={tagData.negotiation_date_range}
                                />
                              </td>
                            </tr>
                          );
                        } else {
                          // Record label view rows
                          const recordData = d as { record_label: string; data_label: string; total_requests: number; accepted_requests: number; rejected_requests: number; requestor_open: number; owner_open: number; last_updated: string; last_activity?: string | null; negotiation_date_range?: { min_date: string | null; max_date: string | null }; };
                          return (
                            <tr key={`record-${recordData.record_label}-${recordData.data_label}-${idx}`}>
                              <td className="border px-4 py-2">{recordData.record_label || "All"}</td>
                              <td className="border px-4 py-2">{recordData.data_label}</td>
                              <td className="border px-4 py-2">{recordData.total_requests}</td>
                              <td className="border px-4 py-2">{recordData.accepted_requests}</td>
                              <td className="border px-4 py-2">{recordData.rejected_requests}</td>
                              <td className="border px-4 py-2">{recordData.requestor_open}</td>
                              <td className="border px-4 py-2">{recordData.owner_open}</td>
                              <td className="border px-4 py-2">
                                <ActivityDatesCell
                                  lastActivity={recordData.last_activity}
                                  lastUpdated={recordData.last_updated}
                                  dateRange={recordData.negotiation_date_range}
                                />
                              </td>
                            </tr>
                          );
                        }
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
