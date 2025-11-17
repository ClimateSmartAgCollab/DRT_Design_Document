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
  tag: string; // still a plain string
  record_label?: string;
  total_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  requestor_open: number;
  owner_open: number;
  generated_at: string; // ISO timestamp
}

async function fetchSummaryStats(): Promise<SummaryStat[]> {
  const res = await fetchApi("/drt/summary-statistics/");
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Status ${res.status}`);
  }
  return json.summary_statistics as SummaryStat[];
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

  // ——— React Query: load summary stats ———
  const summaryQuery = useQuery<SummaryStat[], Error>({
    queryKey: ["owner", "summary-statistics"],
    queryFn: fetchSummaryStats,
    staleTime: 1000 * 60 * 5, // 5m
    retry: 1,
    enabled: !!whoamiQuery.data, // Only fetch if authenticated
  });

  // ——— filter state ———
  const allData = useMemo(() => summaryQuery.data ?? [], [summaryQuery.data]);

  const [dataLabel, setDataLabel] = useState<string>("");
  const [tag, setTag] = useState<string[]>([]);
  const [recordLabel, setRecordLabel] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // ——— Derive filter options ———
  const dataLabelOptions = useMemo(
    () => Array.from(new Set(allData.map((d) => d.data_label))),
    [allData]
  );
  const tagOptions = useMemo(
    () => Array.from(new Set(allData.map((d) => d.tag).filter((t): t is string => typeof t === 'string' && Boolean(t)))),
    [allData]
  );
  const recordLabelOptions = useMemo(
    () => Array.from(new Set(allData.map((d) => typeof d.record_label === 'string' && d.record_label ? d.record_label : undefined).filter((l): l is string => typeof l === 'string' && Boolean(l)))),
    [allData]
  );

  // ——— apply filters client-side ———
  const filteredData = useMemo(() => {
    return allData.filter((d) => {
      if (dataLabel && d.data_label !== dataLabel) return false;
      if (tag.length > 0 && !tag.includes(d.tag || "")) return false;
      if (recordLabel.length > 0 && !recordLabel.includes(d.record_label || "")) return false;
      const genDate = new Date(d.generated_at);
      if (startDate && genDate < new Date(startDate)) return false;
      if (endDate && genDate > new Date(endDate)) return false;
      return true;
    });
  }, [allData, dataLabel, tag, recordLabel, startDate, endDate]);

  // Group filteredData by both record_label and data_label, merging tags and summing numeric fields
  const groupedData = useMemo(() => {
    const map = new Map<string, {
      record_label: string;
      data_label: string;
      tags: Set<string>;
      total_requests: number;
      accepted_requests: number;
      rejected_requests: number;
      requestor_open: number;
      owner_open: number;
      generated_at: string; // Use latest
    }>();
    filteredData.forEach(d => {
      const key = `${d.record_label || ""}|${d.data_label}`;
      if (!map.has(key)) {
        map.set(key, {
          record_label: d.record_label || "",
          data_label: d.data_label,
          tags: new Set(),
          total_requests: 0,
          accepted_requests: 0,
          rejected_requests: 0,
          requestor_open: 0,
          owner_open: 0,
          generated_at: d.generated_at,
        });
      }
      const entry = map.get(key)!;
      if (d.tag) entry.tags.add(d.tag);
      entry.total_requests += d.total_requests;
      entry.accepted_requests += d.accepted_requests;
      entry.rejected_requests += d.rejected_requests;
      entry.requestor_open += d.requestor_open;
      entry.owner_open += d.owner_open;
      // Use latest generated_at
      if (new Date(d.generated_at) > new Date(entry.generated_at)) {
        entry.generated_at = d.generated_at;
      }
    });
    return Array.from(map.values()).map(entry => ({
      ...entry,
      tags: Array.from(entry.tags).join(", "),
    }));
  }, [filteredData]);

  // Use groupedData for table and chart
  const chartData = useMemo(
    () => ({
      labels: groupedData.map((d) => `${d.data_label} - ${d.record_label || "All"}`),
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
          ) : summaryQuery.isError ? (
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

                <section className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr className="bg-gray-100">
                        {[
                          "Record Label",
                          "Data Label",
                          "Tag",
                          "Total",
                          "Accepted",
                          "Rejected",
                          "Req. Open",
                          "Own. Open",
                          "Generated At",
                        ].map((h) => (
                          <th key={h} className="border px-4 py-2">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedData.map((d) => (
                        <tr key={`${d.record_label}-${d.data_label}-${d.generated_at}`}>
                          <td className="border px-4 py-2">{d.record_label || "All"}</td>
                          <td className="border px-4 py-2">{d.data_label}</td>
                          <td className="border px-4 py-2">{d.tags || "All"}</td>
                          <td className="border px-4 py-2">{d.total_requests}</td>
                          <td className="border px-4 py-2">{d.accepted_requests}</td>
                          <td className="border px-4 py-2">{d.rejected_requests}</td>
                          <td className="border px-4 py-2">{d.requestor_open}</td>
                          <td className="border px-4 py-2">{d.owner_open}</td>
                          <td className="border px-4 py-2">
                            {new Date(d.generated_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
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
