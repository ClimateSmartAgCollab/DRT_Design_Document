import React from "react";

interface ActionButtonsProps {
  onActionClick: (action: string) => void;
  isViewingHistory: boolean;
  isAuthenticated: boolean | null;
}

export function ActionButtons({
  onActionClick,
  isViewingHistory,
  isAuthenticated,
}: ActionButtonsProps) {
  const actions = [
    {
      key: "save",
      label: "save",
      color: "bg-[rgb(70,160,35)] hover:bg-[rgb(55,125,28)]",
      restricted: false,
    },
    {
      key: "request_clarification",
      label: "request clarification",
      color: "bg-yellow-500 hover:bg-yellow-600",
      restricted: true,
    },
    {
      key: "accept",
      label: "accept",
      color: "bg-[rgb(70,160,35)] hover:bg-[rgb(55,125,28)]",
      restricted: true,
    },
    {
      key: "reject",
      label: "reject",
      color: "bg-red-600 hover:bg-red-700",
      restricted: true,
    },
  ];

  return (
    <div className="flex space-x-3">
      {actions.map((action) => {
        const isRestricted = action.restricted;
        const showLock = isRestricted && isAuthenticated === false;
        const isDisabled = isViewingHistory;

        return (
          <button
            key={action.key}
            onClick={() => onActionClick(action.key)}
            disabled={isDisabled}
            className={`px-4 py-2 rounded text-white font-medium transition ${
              action.color
            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            title={
              isDisabled
                ? "Actions disabled in historical view"
                : showLock
                ? "Requires email verification"
                : undefined
            }
          >
            <span className="flex items-center">
              {action.label}
              {showLock && !isDisabled && (
                <svg
                  className="ml-1 h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
