import React from "react";

interface PermissionInfoProps {
  isAuthenticated: boolean | null;
}

export function PermissionInfo({ isAuthenticated }: PermissionInfoProps) {
  if (isAuthenticated !== false) return null;

  return (
    <div className="bg-blue-50 border-blue-200">
      <div className="flex items-start">
        <svg
          className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <h3 className="text-sm font-medium text-blue-800">
            Permission Information
          </h3>
          <p className="text-sm mt-1 text-blue-700">
            Anyone with this link can view and save comments. Actions that
            change the negotiation status (accept, reject, request
            clarification) require email verification.
          </p>
        </div>
      </div>
    </div>
  );
}
