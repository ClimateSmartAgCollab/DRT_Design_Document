// app/negotiation/[link_id]/email-entry/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function EmailEntry() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { link_id } = useParams(); // Access `link_id` with `useParams`

  function getCSRFToken(): string {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1] ?? ""
    );
  }

  const {
    mutate: sendOtp,
    isPending,
    isError,
  } = useMutation<void, Error, string>({
    mutationFn: async (emailToSend: string) => {
      const res = await fetchApi(`/drt/verify/requestor/${link_id}/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        body: JSON.stringify({ email: emailToSend }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to send OTP");
      }
    },
    onSuccess: (_data, variables) => {
      sessionStorage.setItem("reqEmail", variables);
      router.push(`/negotiation/${link_id}/otp-verification`);
    },
  });

  const isValidEmail = /\S+@\S+\.\S+/.test(email);
  const isDisabled = isPending || !isValidEmail;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <section className="bg-white w-full max-w-sm p-6 rounded-xl shadow-lg text-center space-y-6">
        {/* Mail Icon */}
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m0 8V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2z"
            />
          </svg>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl font-semibold text-gray-800">
          Verify Your Email
        </h1>
        <p className="text-gray-600">
          We’ll send you a one-time code to access the questionnaire.
        </p>

        {/* Validation & Errors */}
        {isError && error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        {!isValidEmail && email && (
          <p className="text-yellow-600 text-sm">
            Please enter a valid email address.
          </p>
        )}

        {/* Email Input */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Send OTP Button */}
        <button
          onClick={() => sendOtp(email)}
          disabled={isDisabled}
          className={`w-full rounded-lg px-4 py-2 font-medium text-white transition ${
            isDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isPending ? "Sending…" : "Send OTP"}
        </button>
      </section>
    </main>
  );
}
