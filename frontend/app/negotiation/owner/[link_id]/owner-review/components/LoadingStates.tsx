import React from "react";

interface LoadingStatesProps {
  isActing: boolean;
  isVerifyingEmail: boolean;
  emailSent: boolean;
}

export function LoadingStates({
  isActing,
  isVerifyingEmail,
  emailSent,
}: LoadingStatesProps) {
  if (isActing || isVerifyingEmail) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {isVerifyingEmail
              ? "Sending Verification Email"
              : "Processing Your Request"}
          </h2>
          <p className="text-gray-600">
            {isVerifyingEmail
              ? "Please wait while we send the verification email..."
              : "Please wait while we process your action..."}
          </p>
        </div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Verification Email Sent!
            </h2>
            <p className="text-gray-600 mb-6">
              Please check your inbox and click the link to verify your email.
              After verification, your action will be automatically completed.
            </p>
            <div className="text-sm text-gray-500">
              <p>You can close this page and return to your email.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
