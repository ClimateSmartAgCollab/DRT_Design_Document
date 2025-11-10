import React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface HistoryNavigationProps {
  currentIndex: number;
  totalEntries: number;
  onNavigate: (index: number) => void;
  isHistorical: boolean;
}

export function HistoryNavigation({
  currentIndex,
  totalEntries,
  onNavigate,
  isHistorical,
}: HistoryNavigationProps) {
  if (totalEntries <= 1) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        <div className="justify-self-start">
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={currentIndex <= 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-200"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Previous</span>
          </button>
        </div>

        <div className="justify-self-center min-w-0">
          <div className="text-sm font-medium text-gray-700 text-center whitespace-nowrap">
            {isHistorical
              ? `Entry ${currentIndex + 1} of ${totalEntries - 1}`
              : `Latest Version`}
          </div>
          {isHistorical && (
            <div className="text-xs text-gray-500 text-center mt-1">
              Historical View - Read Only
            </div>
          )}
        </div>

        <div className="justify-self-end">
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex >= totalEntries - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-200"
          >
            <span>Next</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
