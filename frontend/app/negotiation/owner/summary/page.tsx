// drt_frontend/app/negotiation/owner/summary/page.tsx

"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import Image from "next/image";
import { Bar } from "react-chartjs-2";
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
import NegotiationLayout from "@/app/components/NegotiationLayout";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  if (summaryQuery.isLoading) {
    return (
      <NegotiationLayout
        userType="owner"
        userEmail={whoamiQuery.data.email}
        isLoading={false}
        pageTitle="Summary Statistics"
      >
        <div className="text-center text-gray-600">Loading…</div>
      </NegotiationLayout>
    );
  }
  if (summaryQuery.isError) {
    return (
      <NegotiationLayout
        userType="owner"
        userEmail={whoamiQuery.data.email}
        isLoading={false}
        pageTitle="Summary Statistics"
      >
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
          ⚠️ {summaryQuery.error.message}
        </div>
      </NegotiationLayout>
    );
  }

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <header className="bg-[#216b96] w-full px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
          <div className="container-default section-y w-full">
            <div className="flex items-start justify-between gap-4 min-w-0">
              {/* Title / Help */}
              <div className="flex-1 min-w-0">

                <div>
                  <span className="block text-white font-sans font-bold text-xl sm:text-2xl md:text-3xl leading-tight">
                    Summary Statistics
                  </span>
                </div>

                {/* Homepage Link */}
                <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 md:pl-6 lg:pl-10">
                  <button
                    onClick={() => router.push("/negotiation/owner/homepage")}
                    className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors px-3 py-2 rounded-md hover:bg-white hover:bg-opacity-10"
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                      />
                    </svg>
                    <span className="font-sans font-medium text-sm sm:text-base">
                      Homepage
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-shrink-0">
                {/* User Avatar Dropdown */}
                <div className="relative flex-shrink-0">
                  {whoamiQuery.isLoading ? (
                    <div className="flex items-center space-x-2 text-white">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : whoamiQuery.data?.email ? (
                    <div className="relative">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors focus:outline-none"
                      >
                        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white flex-shrink-0">
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                            />
                          </svg>
                        </div>
                        <svg 
                          className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} flex-shrink-0`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 9l-7 7-7-7" 
                          />
                        </svg>
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <div className="p-4 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-[#216b96] rounded-full flex items-center justify-center text-white">
                                <svg 
                                  className="w-5 h-5" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{whoamiQuery.data.email}</p>
                                <p className="text-xs text-gray-500 capitalize">owner</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-2">
                            <button
                              onClick={handleLogout}
                              disabled={isLoggingOut}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoggingOut ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                  <span>Logging out...</span>
                                </>
                              ) : (
                                <>
                                  <svg 
                                    className="w-4 h-4" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      strokeWidth={2} 
                                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                                    />
                                  </svg>
                                  <span>Log out</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-white opacity-75">
                      Not authenticated
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-60 lg:h-60 flex-shrink-0">
                  <a
                    href="https://genomecanada.ca/project/climate-smart-data-collaboration-centre-cs-dcc/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Image
                      src="/CS-DCC_Logo-EN_Colour.png"
                      alt="Logo"
                      width={240}
                      height={240}
                      className="rounded-full bg-blue-200 object-contain"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Dropdown backdrop */}
          {isDropdownOpen && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsDropdownOpen(false)}
            />
          )}
        </header>

        <div className="w-full overflow-x-hidden">
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
        </div>
      </main>
    </Providers>
  );
}
