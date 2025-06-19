// app/negotiation/[link_id]/otp-verification/page.tsx
"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function OTPVerificationPage() {
  const { link_id: linkId } = useParams<{ link_id: string }>();
  const router = useRouter();

  const [otp, setOtp] = useState("");
  
  // Mutation to verify OTP
  const verifyOtpMutationFn = async (code: string) => {
    const res = await fetchApi(`/drt/verify/otp/${linkId}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: code }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Invalid OTP. Please try again.");
    }
  };

  const {
    mutate: verifyOtp,
    isPending: isVerifying,
    isError: verifyError,
    error: verifyErrorObj,
  } = useMutation<void, Error, string>({
    mutationFn: verifyOtpMutationFn,
    onSuccess: () => {
      router.push(`/negotiation/${linkId}/request-access`);
    },
  });

  // Mutation to resend OTP
  const {
    mutate: resendOtp,
    isPending: isResending,
    isError: resendError,
    error: resendErrorObj,
    data: resendMessage,
  } = useMutation<string, Error, void>({
    mutationFn: async () => {
      const res = await fetchApi(`/drt/verify/otp/${linkId}/`, {
        method: "GET",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not resend OTP. Please try again.");
      }
      return data.message || "OTP resent! Check your inbox.";
    }
  });


  const isVerifyDisabled = isVerifying || otp.trim().length === 0;


  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <section className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg text-center space-y-6">
        {/* Lock Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <svg
            className="h-6 w-6 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11V7a4 4 0 118 0v4m-4 8h-8a2 2 0 01-2-2v-5a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* Header */}
        <h1 className="text-2xl font-semibold text-gray-800">
          Verify One-Time Passcode
        </h1>

        {/* Instructions */}
        <p className="text-gray-600">
          Enter the code sent to your email to continue.
        </p>

        {/* Error or Success Messages */}
        {verifyError && (
          <p className="text-red-600">{verifyErrorObj?.message}</p>
        )}
        {resendError && (
          <p className="text-red-600">{resendErrorObj?.message}</p>
        )}
        {resendMessage && (
          <p className="text-green-600">{resendMessage}</p>
        )}

        {/* OTP Input */}
        <input
          type="text"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value);
          }}
          placeholder="Enter OTP"
          required
          className="w-full border border-gray-300 px-3 py-2 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => verifyOtp(otp)}
            disabled={isVerifyDisabled}
            className={`flex-1 rounded-lg px-4 py-2 font-medium text-white transition ${
              isVerifyDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isVerifying ? "Verifying…" : "Verify"}
          </button>

          <button
            onClick={() => resendOtp()}
            disabled={isResending}
            className={`flex-1 rounded-lg px-4 py-2 font-medium text-gray-800 transition border ${
              isResending
                ? "bg-gray-200 cursor-not-allowed"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {isResending ? "Resending…" : "Resend Code"}
          </button>
        </div>
      </section>
    </main>
  );
}
