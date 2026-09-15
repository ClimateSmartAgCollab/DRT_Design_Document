"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import {
  buildOutcomeMixChartData,
  type OutcomeMixRow,
} from "../utils/outcomeMix";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const OPTIONS: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
    title: { display: true, text: "Outcome mix" },
    tooltip: {
      mode: "index",
      intersect: false,
    },
  },
  interaction: {
    mode: "index",
    intersect: false,
  },
  scales: {
    x: {
      stacked: true,
      ticks: {
        autoSkip: true,
        maxRotation: 45,
        minRotation: 0,
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: { precision: 0 },
      title: { display: true, text: "Requests" },
    },
  },
};

interface OutcomeMixChartProps {
  rows: OutcomeMixRow[];
}

export function OutcomeMixChart({ rows }: OutcomeMixChartProps) {
  const data = useMemo(() => buildOutcomeMixChartData(rows), [rows]);

  return (
    <section className="bg-white p-4 rounded shadow">
      {rows.length === 0 ? (
        <div>
          <h2 className="text-sm font-medium text-gray-700">Outcome mix</h2>
          <p className="mt-4 text-sm text-gray-500">
            No requests in the current filters.
          </p>
        </div>
      ) : (
        <div className="relative h-80 w-full">
          <Bar data={data} options={OPTIONS} />
        </div>
      )}
    </section>
  );
}
