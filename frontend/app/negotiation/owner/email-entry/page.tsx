// drt_frontend/app/negotiation/owner/email-entry/page.tsx
"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function OwnerEmailEntry() {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  function getCSRFToken(): string {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1] ?? ""
    );
  }

  const mutation = useMutation<void, Error, string>({
    mutationFn: async (emailToSend: string) => {
      const res = await fetchApi("/drt/verify/owner-email/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        body: JSON.stringify({ email: emailToSend }),
      });

      if (!res.ok) {
        let msg = "Failed to send Access link";
        try {
          const body = await res.json();
          msg = body.error ?? msg;
        } catch {
          console.error("Failed to parse error response:", error);
        }
        throw new Error(msg);
      }
    },
    retry: 1,
    onError(err) {
      setError(err.message);
    },
    onSuccess(_, emailSent) {
      sessionStorage.setItem("ownerEmail", emailSent);
      setSuccess(true);
    },
  });

  const isLoading = mutation.status === "pending";
  const isError = mutation.status === "error";

  // Simple email format check
  const isValidEmail = /\S+@\S+\.\S+/.test(email);
  const isDisabled = isLoading || !isValidEmail;

  if (success) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <section className="bg-white w-full max-w-sm p-6 rounded-xl shadow-lg text-center space-y-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Access Link Sent!
          </h1>
          <p className="text-gray-600">
            Check your email and click the Access link to access the dashboard.
          </p>
          {/* Resend feedback */}
          {resendStatus === "success" && (
            <p className="text-green-600 text-sm">Link resent!</p>
          )}
          {resendStatus === "error" && (
            <p className="text-red-600 text-sm">{resendError}</p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                setResendStatus("loading");
                setResendError(null);
                try {
                  await mutation.mutateAsync(email);
                  setResendStatus("success");
                  setTimeout(() => setResendStatus("idle"), 2000); // Reset after 2s
                } catch (err: any) {
                  setResendStatus("error");
                  setResendError(err?.message || "Failed to resend link");
                }
              }}
              disabled={resendStatus === "loading"}
              className={`w-full rounded-lg px-4 py-2 font-medium text-white transition ${
                resendStatus === "loading"
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[rgb(70,160,35)] hover:bg-[rgb(55,125,28)]"
              }`}
            >
              {resendStatus === "loading" ? "Resending…" : `Resend to Same Email`}
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail("");
                setError(null);
                setResendStatus("idle");
                setResendError(null);
              }}
              className="w-full rounded-lg px-4 py-2 font-medium text-[rgb(55,125,28)] border border-[rgb(70,160,35)] bg-white hover:bg-[rgba(180,230,160,0.2)] transition"
            >
              Send to a New Email
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <section className="bg-white w-full max-w-sm p-6 rounded-xl shadow-lg text-center space-y-6">
        {/* Mail Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(180,230,160,0.3)]">
          <svg
            className="h-6 w-6 text-[rgb(70,160,35)]"
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
          We&rsquo;ll send you an access link to access the dashboard.
        </p>

        {/* Validation & Errors */}
        {isError && <p className="text-red-600 text-sm">{error}</p>}
        {!isValidEmail && email && (
          <p className="text-yellow-600 text-sm">
            Please enter a valid email address.
          </p>
        )}

        {/* Email Input */}
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="you@example.com"
          required
          className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)]"
        />

        {/* Send Magic Link Button */}
        <button
          onClick={() => mutation.mutate(email)}
          disabled={isDisabled}
          className={`w-full rounded-lg px-4 py-2 font-medium text-white transition ${
            isDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[rgb(70,160,35)] hover:bg-[rgb(55,125,28)]"
          }`}
        >
          {isLoading ? "Sending…" : "Send Access Link"}
        </button>
      </section>
    </main>
  );
}
