// drt_frontend/app/negotiation/owner/summary/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";
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
  // dataset_id: string;
  data_label: string;
  tag: string;
  total_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  requestor_open: number;
  owner_open: number;
  generated_at: string;
}

export default function OwnerSummaryPage() {
  const params = useSearchParams();
  const email = params.get("owner") ?? "";

  // ——— Filter state ———
  const [dataLabel, setDataLabel] = useState("");
  const [tag,       setTag]       = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");

  // ——— Data state ———
  const [data,    setData]    = useState<SummaryStat[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,  setError]   = useState<string | null>(null);

  // Build your fetch URL with query-params
  const buildUrl = useCallback((ownerId: string) => {
    const qs: string[] = [];
    if (dataLabel)  qs.push(`data_label=${encodeURIComponent(dataLabel)}`);
    if (tag)        qs.push(`tag=${encodeURIComponent(tag)}`);
    if (startDate)  qs.push(`date_from=${startDate}`);
    if (endDate)    qs.push(`date_to=${endDate}`);
    const query = qs.length ? `?${qs.join("&")}` : "";
    return `/drt/summary-statistics/${ownerId}/${query}`;
  }, [dataLabel, tag, startDate, endDate]);

  useEffect(() => {
    if (!email) return setError("Owner email missing"), setLoading(false);

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. lookup owner_id
        const ownerRes = await fetchApi("/datastore/get_cached_data/owner_table");
        if (!ownerRes.ok) throw new Error("Failed loading owner table");
        const { owner_table } = await ownerRes.json();
        const entry = Object.entries(owner_table).find(
          ([_, o]) => (o as { owner_email: string }).owner_email === email
        );
        if (!entry) throw new Error(`No owner found for ${email}`);
        const ownerId = entry[0];

        // 2. fetch with filters
        const res  = await fetchApi(buildUrl(ownerId));
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Status ${res.status}`);
        setData(json.summary_statistics);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [email, buildUrl]);

  // derive dropdown options from data
  const labels = Array.from(new Set(data.map((d) => d.data_label)));
  const tags   = Array.from(new Set(data.map((d) => d.tag)));

  if (loading) return <div className="p-6">Loading…</div>;
  if (error)   return (
    <div className="p-6">
      <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
        ⚠️ {error}
      </div>
    </div>
  );
  if (!data.length) return <div className="p-6">No statistics found.</div>;

  // Chart data (same as before)…
  const chartLabels = data.map((d) => `${d.data_label} / ${d.tag}`);
  const chartData = {
    labels: chartLabels,
    datasets: [
      { label: "Total",    data: data.map((d) => d.total_requests) },
      { label: "Accepted", data: data.map((d) => d.accepted_requests) },
      { label: "Rejected", data: data.map((d) => d.rejected_requests) },
      { label: "Req. Open", data: data.map((d) => d.requestor_open) },
      { label: "Own. Open", data: data.map((d) => d.owner_open) },
    ],
  };

  return (
    <main className="flex">
      {/* Sidebar */}
      <SummarySidebar
        dataLabelOptions={labels}
        selectedDataLabel={dataLabel}
        onDataLabelChange={setDataLabel}
        tagOptions={tags}
        selectedTag={tag}
        onTagChange={setTag}
        startDate={startDate}
        endDate={endDate}
        onDateChange={(field, v) => field === "start" ? setStartDate(v) : setEndDate(v)}
        onReset={() => {
          setDataLabel(""); setTag(""); setStartDate(""); setEndDate("");
        }}
      />

      {/* Main content */}
      <div className="flex-1 p-6 space-y-8">
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
                  "Dataset", "Label", "Tag",
                  "Total", "Accepted", "Rejected",
                  "Req. Open", "Own. Open", "Generated At",
                ].map((h) => (
                  <th key={h} className="border px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={`${d.data_label}-${d.tag}-${d.generated_at}`}>
                  {/* <td className="border px-4 py-2">{d.dataset_id}</td> */}
                  <td className="border px-4 py-2">{d.data_label}</td>
                  <td className="border px-4 py-2">{d.tag}</td>
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
  );
}
