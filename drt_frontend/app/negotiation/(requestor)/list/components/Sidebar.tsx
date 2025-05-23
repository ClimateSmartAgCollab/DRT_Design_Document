// drt_frontend\app\negotiation\owner\list\components\Sidebar.tsx
import React from "react";
import { ALL_STATUSES, Status, ArchivedFilter, SortOption } from "../types";

interface SidebarProps {
  searchTerm: string;
  onSearchChange: (s: string) => void;
  statusFilter: Status[];
  onToggleStatus: (s: Status) => void;
  archivedFilter: ArchivedFilter;
//   onArchivedChange: (f: ArchivedFilter) => void;
  startDate: string;
  endDate: string;
  onDateChange: (field: "start" | "end", value: string) => void;
  sortOption: SortOption;
  onSortChange: (opt: SortOption) => void;
  onReset: () => void;
}

export function Sidebar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onToggleStatus,
  archivedFilter,
//   onArchivedChange,
  startDate,
  endDate,
  onDateChange,
  sortOption,
  onSortChange,
  onReset,
}: SidebarProps) {
  return (
    <aside className="w-72 p-6 bg-white border-r border-gray-200">
      <h2 className="text-2xl font-semibold mb-4">Filters</h2>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Search</label>
        <input
          type="text"
          placeholder="ID or conv ID…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Status */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Status</h3>
        {ALL_STATUSES.map((status) => (
          <label key={status} className="flex items-center mb-1 text-sm">
            <input
              type="checkbox"
              checked={statusFilter.includes(status)}
              onChange={() => onToggleStatus(status)}
              className="mr-2"
            />
            <span className="capitalize">{status}</span>
          </label>
        ))}
      </div>

      {/* Archived */}
      {/* <div className="mb-6">
        <h3 className="font-medium mb-2">Archived</h3>
        {(["all", "archived", "active"] as ArchivedFilter[]).map((opt) => (
          <label key={opt} className="inline-flex items-center mr-4 text-sm">
            <input
              type="radio"
              name="archived"
              value={opt}
              checked={archivedFilter === opt}
              onChange={() => onArchivedChange(opt)}
              className="mr-1"
            />
            <span>
              {opt === "all" ? "All" : opt === "archived" ? "Yes" : "No"}
            </span>
          </label>
        ))}
      </div> */}

      {/* Date Range */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Date Range</h3>
        <label className="block mb-2 text-sm">
          From
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange("start", e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          To
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange("end", e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-1 text-sm"
          />
        </label>
      </div>

      {/* Sort */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Sort By</h3>
        <select
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="created_desc">Newest</option>
          <option value="created_asc">Oldest</option>
          <option value="status_asc">Status A→Z</option>
          <option value="status_desc">Status Z→A</option>
          <option value="archived_first">Archived first</option>
          <option value="archived_last">Archived last</option>
        </select>
      </div>

      <button
        onClick={onReset}
        className="w-full px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
      >
        Reset All
      </button>
    </aside>
  );
}
