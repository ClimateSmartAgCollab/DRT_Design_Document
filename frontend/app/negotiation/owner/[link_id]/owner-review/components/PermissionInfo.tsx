import React from "react";

interface PermissionInfoProps {
  isAuthenticated: boolean | null;
}

export function PermissionInfo({ isAuthenticated }: PermissionInfoProps) {
  if (isAuthenticated !== false) return null;

  return (
    <div className="bg-[rgba(180,230,160,0.2)] border-[rgb(55,125,28)]">
      <div className="flex items-start">
        <svg
          className="h-5 w-5 text-[rgb(70,160,35)] mt-0.5 mr-2 flex-shrink-0"
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
          <h3 className="text-sm font-medium text-[rgb(55,125,28)]">
            Permission Information
          </h3>
          <p className="text-sm mt-1 text-[rgb(55,125,28)]">
            Anyone with this link can view and save comments. Actions that
            change the negotiation status (accept, reject, request
            clarification) require email verification.
          </p>
        </div>
      </div>
    </div>
  );
}
