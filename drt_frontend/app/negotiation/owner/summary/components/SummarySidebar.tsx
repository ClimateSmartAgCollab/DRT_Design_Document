"use client";

import React from "react";

interface SummarySidebarProps {
  dataLabelOptions: string[];
  selectedDataLabel: string;
  onDataLabelChange: (value: string) => void;

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
  // For new multi-select Data Label
  const [selectedDataLabels, setSelectedDataLabels] = React.useState<string[]>(selectedDataLabel ? [selectedDataLabel] : []);
  React.useEffect(() => {
    if (selectedDataLabel && !selectedDataLabels.includes(selectedDataLabel)) {
      setSelectedDataLabels([selectedDataLabel]);
    }
  }, [selectedDataLabel]);

  // Helper for All option
  const handleAllChange = (type: 'dataLabel' | 'tag' | 'recordLabel', checked: boolean) => {
    if (type === 'dataLabel') {
      if (checked) {
        setSelectedDataLabels([]);
        onDataLabelChange("");
      }
    } else if (type === 'tag') {
      if (checked) onTagChange([]);
    } else if (type === 'recordLabel') {
      if (checked) onRecordLabelChange([]);
    }
  };

  // Data Label: multi-checkbox
  return (
    <aside className="w-80 p-6 bg-white border-r border-gray-200">
      <h2 className="text-2xl font-semibold mb-4">Filters</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Data Label</label>
        <div className="w-full border rounded px-3 py-2 text-sm bg-white max-h-40 overflow-y-auto">
          <label className="flex items-center mb-1 truncate">
            <input
              type="checkbox"
              checked={selectedDataLabels.length === 0}
              onChange={e => handleAllChange('dataLabel', e.target.checked)}
              className="mr-2"
            />
            <span className="truncate">All</span>
          </label>
          {dataLabelOptions.map(lbl => (
            <label key={lbl} className="flex items-center mb-1 truncate">
              <input
                type="checkbox"
                checked={selectedDataLabels.includes(lbl)}
                onChange={e => {
                  let next;
                  if (e.target.checked) {
                    next = [...selectedDataLabels, lbl];
                  } else {
                    next = selectedDataLabels.filter(l => l !== lbl);
                  }
                  setSelectedDataLabels(next);
                  // If none selected, treat as All
                  onDataLabelChange(next.length === 1 ? next[0] : "");
                }}
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

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Date From</label>
        <input
          type="date"
          value={startDate}
          onChange={e => onDateChange("start", e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Date To</label>
        <input
          type="date"
          value={endDate}
          onChange={e => onDateChange("end", e.target.value)}
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
