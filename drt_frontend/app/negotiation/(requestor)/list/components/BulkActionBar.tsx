// drt_frontend\app\negotiation\list\components\BulkActionBar.tsx
import React from "react";

interface BulkActionBarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
}

export function BulkActionBar({ selectedCount, onDeleteSelected }: BulkActionBarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={onDeleteSelected}
        disabled={selectedCount === 0}
        className={`px-4 py-2 rounded ${
          selectedCount
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        }`}
      >
        Delete Selected ({selectedCount})
      </button>
    </div>
  );
}