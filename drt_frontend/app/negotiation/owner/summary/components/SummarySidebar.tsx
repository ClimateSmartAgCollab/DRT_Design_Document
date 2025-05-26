// drt_frontend\app\negotiation\owner\summary\components\Sidebar.tsx

"use client";

import React from "react";

interface SummarySidebarProps {
  dataLabelOptions: string[];
  selectedDataLabel: string;
  onDataLabelChange: (value: string) => void;

  tagOptions: string[];
  selectedTag: string;
  onTagChange: (value: string) => void;

  startDate: string;
  endDate: string;
  onDateChange: (field: "start" | "end", value: string) => void;

  onReset: () => void;
}

export function SummarySidebar({
  dataLabelOptions,
  selectedDataLabel,
  onDataLabelChange,
  tagOptions,
  selectedTag,
  onTagChange,
  startDate,
  endDate,
  onDateChange,
  onReset,
}: SummarySidebarProps) {
  return (
    <aside className="w-64 p-6 bg-white border-r border-gray-200">
      <h2 className="text-2xl font-semibold mb-4">Filters</h2>

      {/* Data Label */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Data Label</label>
        <select
          value={selectedDataLabel}
          onChange={(e) => onDataLabelChange(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option key="all-data-label" value="">
            All
          </option>

          {dataLabelOptions.map((lbl, idx) => (
            <option
              key={lbl != null && lbl !== "" ? lbl : `data-label-${idx}`}
              value={lbl ?? ""}
            >
              {lbl && lbl !== "" ? lbl : "(none)"}
            </option>
          ))}
        </select>
      </div>

      {/* Tag */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Tag</label>
        <select
          value={selectedTag}
          onChange={(e) => onTagChange(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option key="all-tag" value="">
            All
          </option>

          {tagOptions.map((t, idx) => (
            <option
              key={t != null && t !== "" ? t : `tag-${idx}`}
              value={t ?? ""}
            >
              {t && t !== "" ? t : "(none)"}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Date From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onDateChange("start", e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Date To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onDateChange("end", e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>

      <button
        onClick={onReset}
        className="w-full mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
      >
        Reset Filters
      </button>
    </aside>
  );
}
