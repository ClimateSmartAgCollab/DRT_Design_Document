import React from "react";
import { ALL_STATUSES, Status, ArchivedFilter, SortOption, STATUS_DISPLAY_NAMES } from "../types";

interface SidebarProps {
  searchTerm: string;
  onSearchChange: (s: string) => void;
  statusFilter: Status[];
  onToggleStatus: (s: Status) => void;
  archivedFilter: ArchivedFilter;
  onArchivedChange: (value: ArchivedFilter) => void;
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
  onArchivedChange,
  startDate,
  endDate,
  onDateChange,
  sortOption,
  onSortChange,
  onReset,
}: SidebarProps) {
  return (
    <aside className="w-full lg:w-72 bg-white border-r-0 lg:border-r border-b lg:border-b-0 border-gray-200 p-4 sm:p-6">
      <h2 className="mb-4 text-xl sm:text-2xl font-semibold text-gray-800">Filters</h2>

      {/* Search */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Search
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Negotiation or Conversation ID…"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)]"
        />
      </div>

      {/* Archived */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Archived</h3>
        <select
          value={archivedFilter}
          onChange={(e) => onArchivedChange(e.target.value as ArchivedFilter)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)]"
        >
          <option className="font-sans text-sm" value="all">
            All records
          </option>
          <option className="font-sans text-sm" value="active">
            Active only
          </option>
          <option className="font-sans text-sm" value="archived">
            Archived only
          </option>
        </select>
      </div>

      {/* Status */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Status</h3>
        {ALL_STATUSES.map((status) => (
          <label key={status} className="flex items-center mb-2 text-sm">
            <input
              type="checkbox"
              checked={statusFilter.includes(status)}
              onChange={() => onToggleStatus(status)}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-[rgb(70,160,35)] focus:ring-[rgb(70,160,35)]"
            />
            <span className={`text-gray-800`}>
              {STATUS_DISPLAY_NAMES[status]}
            </span>
          </label>
        ))}
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Date Range</h3>
        <label className="mb-2 block text-sm text-gray-700">
          From
          <input
            type="date"
            value={startDate}
            onChange={(e) => onDateChange("start", e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)]"
          />
        </label>
        <label className="block text-sm text-gray-700">
          To
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange("end", e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)]"
          />
        </label>
      </div>

      {/* Sort */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Sort By</h3>
        <select
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="w-full rounded border border-gray-300 px-3 py-2
           text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)]"
        >
          <option className="font-sans text-sm" value="created_desc">
            Newest
          </option>
          <option className="font-sans text-sm" value="created_asc">
            Oldest
          </option>
          <option className="font-sans text-sm" value="status_asc">
            Status A→Z
          </option>
          <option className="font-sans text-sm" value="status_desc">
            Status Z→A
          </option>
        </select>
      </div>

      <button
        onClick={onReset}
        className="w-full rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
      >
        Reset All
      </button>
    </aside>
  );
}