// drt_frontend\app\negotiation\owner\summary\page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "chart.js/auto";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SummaryStat {
  dataset_id: string;
  total_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  average_response_time: string;
  generated_at: string;
}

export default function OwnerSummaryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("owner") || "";
  const [data, setData] = useState<SummaryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setError("No owner email provided in query.");
      setLoading(false);
      return;
    }

    async function loadSummary() {
      try {
        // Load the owner_table from cache
        const ownerRes = await fetchApi(
          "/datastore/get_cached_data/owner_table"
        );
        if (!ownerRes.ok) throw new Error("Failed to load owner table");
        const {
          owner_table,
        }: {
          owner_table: Record<
            string,
            { username: string; owner_email: string }
          >;
        } = await ownerRes.json();

        // Find the matching owner_id
        const ownerIds = Object.entries(owner_table)
          .filter(([, owner]) => owner.owner_email === email)
          .map(([owner_id]) => owner_id);

        if (ownerIds.length === 0) {
          throw new Error(`No owner found for email: ${email}`);
        }
        const ownerId = ownerIds[0];

        // Fetch summary-statistics for that ownerId
        const res = await fetchApi(`/drt/summary-statistics/${ownerId}/`);
        const json = await res.json(); // always read the body
        if (!res.ok) {
          // backend sends { error: "Owner statistics not found." }
          setError(json.error ?? `Summary API returned ${res.status}`);
          return;
        }
        setData(json.summary_statistics);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [email, router]);

  if (loading) return <div className="p-6">Loading summary…</div>;

  if (error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
          ⚠️ {error}
        </div>
      </div>
    );
  if (data.length === 0) return <div className="p-6">No statistics found.</div>;

  //Normalize the ID into a string
  const formatId = (d: SummaryStat) =>
    Array.isArray(d.dataset_id) ? d.dataset_id.join(", ") : d.dataset_id;

  // Build chart labels off that same string
  const labels = data.map((d) => formatId(d));

  const chartData = {
    labels,
    datasets: [
      { label: "Total", data: data.map((d) => d.total_requests) },
      { label: "Accepted", data: data.map((d) => d.accepted_requests) },
      { label: "Rejected", data: data.map((d) => d.rejected_requests) },
    ],
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">Summary Statistics</h1>

      {/* Bar chart */}
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

      {/* Fallback table */}
      <section className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Dataset ID</th>
              <th className="border px-4 py-2">Total</th>
              <th className="border px-4 py-2">Accepted</th>
              <th className="border px-4 py-2">Rejected</th>
              <th className="border px-4 py-2">Avg. Resp. Time</th>
              <th className="border px-4 py-2">Generated At</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => {
              const idStr = formatId(d);
              // use generated_at (or even the array index) to make each key unique:
              const rowKey = `${idStr}-${d.generated_at}`;

              return (
                <tr key={rowKey}>
                  <td className="border px-4 py-2">{idStr}</td>
                  <td className="border px-4 py-2">{d.total_requests}</td>
                  <td className="border px-4 py-2">{d.accepted_requests}</td>
                  <td className="border px-4 py-2">{d.rejected_requests}</td>
                  <td className="border px-4 py-2">
                    {d.average_response_time}
                  </td>
                  <td className="border px-4 py-2">
                    {new Date(d.generated_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
