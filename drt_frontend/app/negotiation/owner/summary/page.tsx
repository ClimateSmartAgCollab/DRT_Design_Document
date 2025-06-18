// drt_frontend/app/negotiation/owner/summary/page.tsx

"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
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

  // ——— React Query: load summary stats ———
  const summaryQuery = useQuery<SummaryStat[], Error>({
    queryKey: ["owner", "summary-statistics"],
    queryFn: fetchSummaryStats,
    staleTime: 1000 * 60 * 5, // 5m
    retry: 1,
  });

  // ——— filter state ———
  const allData = summaryQuery.data ?? [];

  const [dataLabel, setDataLabel] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // ——— Derive filter options ———
  const dataLabelOptions = useMemo(
    () => Array.from(new Set(allData.map((d) => d.data_label))),
    [allData]
  );
  const tagOptions = useMemo(
    () => Array.from(new Set(allData.map((d) => d.tag).filter((t) => t))),
    [allData]
  );

  // ——— apply filters client-side ———
  const filteredData = useMemo(() => {
    return allData.filter((d) => {
      if (dataLabel && d.data_label !== dataLabel) return false;
      if (tag && d.tag !== tag) return false;
      const genDate = new Date(d.generated_at);
      if (startDate && genDate < new Date(startDate)) return false;
      if (endDate && genDate > new Date(endDate)) return false;
      return true;
    });
  }, [allData, dataLabel, tag, startDate, endDate]);

  // ——— build chart data from filteredData ———
  const chartData = useMemo(
    () => ({
      labels: filteredData.map((d) => `${d.data_label} / ${d.tag || "(all)"}`),
      datasets: [
        {
          label: "Total",
          data: filteredData.map((d) => d.total_requests),
        },
        {
          label: "Accepted",
          data: filteredData.map((d) => d.accepted_requests),
        },
        {
          label: "Rejected",
          data: filteredData.map((d) => d.rejected_requests),
        },
        {
          label: "Req. Open",
          data: filteredData.map((d) => d.requestor_open),
        },
        {
          label: "Own. Open",
          data: filteredData.map((d) => d.owner_open),
        },
      ],
    }),
    [filteredData]
  );

  if (summaryQuery.isLoading) {
    return <div className="p-6 text-center text-gray-600">Loading…</div>;
  }
  if (summaryQuery.isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
          ⚠️ {summaryQuery.error.message}
        </div>
      </div>
    );
  }

  return (
    <Providers>
      <main className="flex">
        <SummarySidebar
          dataLabelOptions={dataLabelOptions}
          selectedDataLabel={dataLabel}
          onDataLabelChange={setDataLabel}
          tagOptions={tagOptions}
          selectedTag={tag}
          onTagChange={setTag}
          startDate={startDate}
          endDate={endDate}
          onDateChange={(field, v) =>
            field === "start" ? setStartDate(v) : setEndDate(v)
          }
          onReset={() => {
            setDataLabel("");
            setTag("");
            setStartDate("");
            setEndDate("");
          }}
        />

        <div className="flex-1 p-6 space-y-8">
          <button
            onClick={() => router.push("/negotiation/owner/homepage")}
            className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Back to homepage
          </button>
          <h1 className="text-3xl font-bold">Summary Statistics</h1>

          <section className="bg-white p-4 rounded shadow">
            <Bar
              data={chartData}
              options={{
                responsive: true,
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
                {filteredData.map((d) => (
                  <tr key={`${d.data_label}-${d.tag}-${d.generated_at}`}>
                    <td className="border px-4 py-2">{d.data_label}</td>
                    <td className="border px-4 py-2">{d.tag || "(all)"}</td>
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
      </main>
    </Providers>
  );
}
