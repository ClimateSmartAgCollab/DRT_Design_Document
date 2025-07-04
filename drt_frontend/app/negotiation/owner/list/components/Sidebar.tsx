// drt_frontend\app\negotiation\owner\list\components\Sidebar.tsx
import React from "react";
import { ALL_STATUSES, Status, ArchivedFilter, SortOption } from "../types";

interface SidebarProps {
  searchTerm: string;
  onSearchChange: (s: string) => void;
  statusFilter: Status[];
  onToggleStatus: (s: Status) => void;
  archivedFilter: ArchivedFilter;
  onArchivedChange: (f: ArchivedFilter) => void;
  startDate: string;
  endDate: string;
  onDateChange: (field: "start" | "end", value: string) => void;
  sortOption: SortOption;
  onSortChange: (opt: SortOption) => void;
  onReset: () => void;
  tagOptions: string[];
  selectedTag: string[];
  onTagChange: (tags: string[]) => void;
  recordLabelOptions: string[];
  selectedRecordLabel: string[];
  onRecordLabelChange: (labels: string[]) => void;
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
  tagOptions,
  selectedTag,
  onTagChange,
  recordLabelOptions,
  selectedRecordLabel,
  onRecordLabelChange,
}: SidebarProps) {
  // Helper for All option
  const handleAllChange = (type: 'tag' | 'recordLabel', checked: boolean) => {
    if (type === 'tag') {
      if (checked) onTagChange([]);
    } else if (type === 'recordLabel') {
      if (checked) onRecordLabelChange([]);
    }
  };

  return (
    <aside className="w-80 bg-white border-r border-gray-200 p-6">
      <h2 className="mb-4 text-2xl font-semibold text-gray-800">Filters</h2>

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
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
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
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
            />
            <span className="capitalize text-gray-800">{status}</span>
          </label>
        ))}
      </div>

      {/* Archived */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">Archived</h3>
        {(["all", "archived", "active"] as ArchivedFilter[]).map((opt) => (
          <label key={opt} className="inline-flex items-center mr-4 text-sm  text-gray-700">
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
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>
        <label className="block text-sm text-gray-700">
          To
          <input
            type="date"
            value={endDate}
            onChange={(e) => onDateChange("end", e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
           text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
          <option className="font-sans text-sm" value="archived_first">
            Archived first
          </option>
          <option className="font-sans text-sm" value="archived_last">
            Archived last
          </option>
        </select>
      </div>

      {/* Tag Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Tag</label>
        <div className="w-full border rounded px-3 py-2 text-sm bg-white max-h-40 overflow-y-auto">
          <label className="flex items-center mb-1 truncate">
            <input
              type="checkbox"
              checked={selectedTag.length === 0}
              onChange={e => handleAllChange('tag', e.target.checked)}
              className="mr-2"
            />
            <span className="truncate">All</span>
          </label>
          {tagOptions.map(t => (
            <label key={t} className="flex items-center mb-1 truncate">
              <input
                type="checkbox"
                checked={selectedTag.includes(t)}
                onChange={e => {
                  if (e.target.checked) {
                    onTagChange([...selectedTag, t]);
                  } else {
                    onTagChange(selectedTag.filter(tag => tag !== t));
                  }
                }}
                className="mr-2"
              />
              <span className="truncate" title={t}>{t}</span>
            </label>
          ))}
          {tagOptions.length === 0 && <span className="text-gray-400">No tags</span>}
        </div>
      </div>

      {/* Record Label Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Record Label</label>
        <div className="w-full border rounded px-3 py-2 text-sm bg-white max-h-40 overflow-y-auto">
          <label className="flex items-center mb-1 truncate">
            <input
              type="checkbox"
              checked={selectedRecordLabel.length === 0}
              onChange={e => handleAllChange('recordLabel', e.target.checked)}
              className="mr-2"
            />
            <span className="truncate">All</span>
          </label>
          {recordLabelOptions.map(l => (
            <label key={l} className="flex items-center mb-1 truncate">
              <input
                type="checkbox"
                checked={selectedRecordLabel.includes(l)}
                onChange={e => {
                  if (e.target.checked) {
                    onRecordLabelChange([...selectedRecordLabel, l]);
                  } else {
                    onRecordLabelChange(selectedRecordLabel.filter(label => label !== l));
                  }
                }}
                className="mr-2"
              />
              <span className="truncate" title={l}>{l}</span>
            </label>
          ))}
          {recordLabelOptions.length === 0 && <span className="text-gray-400">No record labels</span>}
        </div>
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
