"use client";

import React from "react";

interface SummarySidebarProps {
  dataLabelOptions: string[];
  selectedDataLabel: string[];
  onDataLabelChange: (value: string[]) => void;

  tagOptions: string[];
  selectedTag: string[];
  onTagChange: (value: string[]) => void;
  tagMatch: "all" | "any";
  onTagMatchChange: (value: "all" | "any") => void;

  recordLabelOptions: string[];
  selectedRecordLabel: string[];
  onRecordLabelChange: (value: string[]) => void;

  startDate: string;
  endDate: string;
  onDateChange: (field: "start" | "end", value: string) => void;
  dateField: "created" | "decided";
  onDateFieldChange: (value: "created" | "decided") => void;

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
  tagMatch,
  onTagMatchChange,
  recordLabelOptions,
  selectedRecordLabel,
  onRecordLabelChange,
  startDate,
  endDate,
  onDateChange,
  dateField,
  onDateFieldChange,
  onReset,
}: SummarySidebarProps) {
  return (
    <div className="flex flex-col min-w-0">
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
        {selectedTag.length > 1 && (
          <div className="mt-2 flex gap-4 text-xs text-gray-600">
            <label className="flex items-center">
              <input
                type="radio"
                name="summary-tag-match"
                checked={tagMatch === "all"}
                onChange={() => onTagMatchChange("all")}
                className="mr-1"
              />
              Match all
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="summary-tag-match"
                checked={tagMatch === "any"}
                onChange={() => onTagMatchChange("any")}
                className="mr-1"
              />
              Match any
            </label>
          </div>
        )}
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
        <p className="block text-sm font-medium mb-2">Date window</p>
        <div className="flex flex-wrap gap-4 mb-3 text-sm">
          <label className="flex items-center">
            <input
              type="radio"
              name="summary-date-field"
              checked={dateField === "created"}
              onChange={() => onDateFieldChange("created")}
              className="mr-2"
            />
            Request created
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="summary-date-field"
              checked={dateField === "decided"}
              onChange={() => onDateFieldChange("decided")}
              className="mr-2"
            />
            Decided
          </label>
        </div>
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
    </div>
  );
}
