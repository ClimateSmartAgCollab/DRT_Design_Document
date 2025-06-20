// drt_frontend/app/negotiation/(requestor)/verify-otp/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function ReqVerifyOtp() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  // Load stored email or redirect
  useEffect(() => {
    const stored = sessionStorage.getItem("reqEmail");
    if (!stored) {
      router.replace("/negotiation/email-entry");
    } else {
      setEmail(stored);
    }
  }, [router]);

  // Verify OTP mutation
  // Define the mutation function separately
  const verifyOtpMutation = async ({
    email,
    otp,
  }: {
    email: string;
    otp: string;
  }) => {
    const res = await fetchApi(
      `/drt/verify/req-otp/${encodeURIComponent(email)}/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      }
    );
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "OTP verification failed");
    }
  };

  const {
    mutate: verifyOtp,
    isPending: isVerifying,
    isError: verifyError,
    error: verifyErrorObj,
  } = useMutation<void, Error, { email: string; otp: string }>({
    mutationFn: verifyOtpMutation,
    onSuccess: () => {
      router.push("/negotiation/homepage");
    },
  });

  // Resend OTP mutation
  const {
    mutate: resendOtp,
    isPending: isResending,
    isError: resendError,
    error: resendErrorObj,
    data: resendMessage,
  } = useMutation<string, Error, void>({
    mutationFn: async () => {
      const res = await fetchApi(
        `/drt/verify/req-otp/${encodeURIComponent(email!)}/`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not resend OTP");
      }
      return data.message || "OTP resent! Check your inbox.";
    },
  });

  // While email is loading
  if (email === null) {
    return null;
  }

  const isVerifyDisabled = isVerifying || otp.trim().length === 0;
  const isResendDisabled = isResending;

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
          Enter the code sent to <span className="font-medium">{email}</span>.
        </p>

        {/* Messages */}
        {verifyError && (
          <p className="text-red-600">{verifyErrorObj?.message}</p>
        )}
        {resendError && (
          <p className="text-red-600">{resendErrorObj?.message}</p>
        )}
        {resendMessage && <p className="text-green-600">{resendMessage}</p>}

        {/* OTP Input */}
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter 6-digit code"
          maxLength={6}
          required
          className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => verifyOtp({ email: email!, otp })}
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
            disabled={isResendDisabled}
            className={`flex-1 rounded-lg px-4 py-2 font-medium text-gray-800 transition border ${
              isResendDisabled
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
