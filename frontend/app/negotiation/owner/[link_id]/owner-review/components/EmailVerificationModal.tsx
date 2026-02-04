import React, { useState } from "react";

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (email: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function EmailVerificationModal({
  isOpen,
  onClose,
  onVerify,
  isLoading,
  error,
}: EmailVerificationModalProps) {
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Email Verification Required
        </h3>
        <p className="text-gray-600 mb-4">
          To perform this action, please verify your email address. We&apos;ll
          send you a verification link. After verification, your action will be
          automatically completed.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)] mb-4"
          disabled={isLoading}
        />

        <div className="flex space-x-3">
          <button
            onClick={() => onVerify(email)}
            disabled={!email}
            className="flex-1 bg-[rgb(70,160,35)] text-white px-4 py-2 rounded hover:bg-[rgb(55,125,28)] disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send Verification
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
