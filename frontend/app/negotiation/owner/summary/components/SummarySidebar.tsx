"use client";

import React from "react";

interface SummarySidebarProps {
  dataLabelOptions: string[];
  selectedDataLabel: string[];
  onDataLabelChange: (value: string[]) => void;

  tagOptions: string[];
  selectedTag: string[];
  onTagChange: (value: string[]) => void;

  recordLabelOptions: string[];
  selectedRecordLabel: string[];
  onRecordLabelChange: (value: string[]) => void;

  startDate: string;
  endDate: string;
  onDateChange: (field: "start" | "end", value: string) => void;

  onReset: () => void;
}

function toggleValue(selected: string[], value: string, onChange: (next: string[]) => void) {
  if (selected.includes(value)) {
    onChange(selected.filter((item) => item !== value));
  } else {
    onChange([...selected, value]);
  }
}

export function SummarySidebar({
  dataLabelOptions,
  selectedDataLabel,
  onDataLabelChange,
  tagOptions,
  selectedTag,
  onTagChange,
  recordLabelOptions,
  selectedRecordLabel,
  onRecordLabelChange,
  startDate,
  endDate,
  onDateChange,
  onReset,
}: SummarySidebarProps) {
  return (
    <aside className="w-80 p-6 bg-white border-r border-gray-200">
      <h2 className="text-2xl font-semibold mb-4">Filters</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Data Label</label>
        <div className="w-full border rounded px-3 py-2 text-sm bg-white max-h-40 overflow-y-auto">
          <label className="flex items-center mb-1 truncate">
            <input
              type="checkbox"
              checked={selectedDataLabel.length === 0}
              onChange={(e) => {
                if (e.target.checked) onDataLabelChange([]);
              }}
              className="mr-2"
            />
            <span className="truncate">All</span>
          </label>
          {dataLabelOptions.map((lbl) => (
            <label key={lbl} className="flex items-center mb-1 truncate">
              <input
                type="checkbox"
                checked={selectedDataLabel.includes(lbl)}
                onChange={() => toggleValue(selectedDataLabel, lbl, onDataLabelChange)}
                className="mr-2"
              />
              <span className="truncate" title={lbl}>{lbl}</span>
            </label>
          ))}
          {dataLabelOptions.length === 0 && <span className="text-gray-400">No data labels</span>}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Tag</label>
        <div className="w-full border rounded px-3 py-2 text-sm bg-white max-h-40 overflow-y-auto">
          <label className="flex items-center mb-1 truncate">
            <input
              type="checkbox"
              checked={selectedTag.length === 0}
              onChange={(e) => {
                if (e.target.checked) onTagChange([]);
              }}
              className="mr-2"
            />
            <span className="truncate">All</span>
          </label>
          {tagOptions.map((t) => (
            <label key={t} className="flex items-center mb-1 truncate">
              <input
                type="checkbox"
                checked={selectedTag.includes(t)}
                onChange={() => toggleValue(selectedTag, t, onTagChange)}
                className="mr-2"
              />
              <span className="truncate" title={t}>{t}</span>
            </label>
          ))}
          {tagOptions.length === 0 && <span className="text-gray-400">No tags</span>}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Record Label</label>
        <div className="w-full border rounded px-3 py-2 text-sm bg-white max-h-40 overflow-y-auto">
          <label className="flex items-center mb-1 truncate">
            <input
              type="checkbox"
              checked={selectedRecordLabel.length === 0}
              onChange={(e) => {
                if (e.target.checked) onRecordLabelChange([]);
              }}
              className="mr-2"
            />
            <span className="truncate">All</span>
          </label>
          {recordLabelOptions.map((l) => (
            <label key={l} className="flex items-center mb-1 truncate">
              <input
                type="checkbox"
                checked={selectedRecordLabel.includes(l)}
                onChange={() => toggleValue(selectedRecordLabel, l, onRecordLabelChange)}
                className="mr-2"
              />
              <span className="truncate" title={l}>{l}</span>
            </label>
          ))}
          {recordLabelOptions.length === 0 && <span className="text-gray-400">No record labels</span>}
        </div>
      </div>

      <div className="mb-6">
        <p className="block text-sm font-medium mb-2">Request created</p>
        <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onDateChange("start", e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm mb-3"
        />
        <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
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
