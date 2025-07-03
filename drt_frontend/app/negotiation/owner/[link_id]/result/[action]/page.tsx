// drt_frontend/app/negotiation/owner/[link_id]/result/[action]/page.tsx
"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import { useRouter } from "next/navigation";

export default function OutcomePage() {
  const router = useRouter();
  const { link_id, action } = useParams<{
    link_id: string;
    action: string;
  }>();
  const qc = useQueryClient();

  // State for reject rationale
  const [rationale, setRationale] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutation to send rationale + reject
  const rationaleMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: async (text) => {
      const form = new FormData();
      form.append("reject", "true");
      form.append("rationale", text);
      const res = await fetchApi(`/drt/owner_review/${link_id}/`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
      return json;
    },
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["ownerReview", link_id, "result"] });
    },
    onError(err) {
      setError(err.message);
    },
  });

  const isSubmitting = rationaleMutation.isPending;

  // Config for all outcomes
  const config: Record<
    string,
    { title: string; lines: string[]; color: string; iconPath: string }
  > = {
    accept: {
      title: "Thank you!",
      lines: [
        "Your acceptance has been recorded.",
        "Please check your email for the license agreement files.",
      ],
      color: "green",
      iconPath: "M5 13l4 4L19 7",
    },
    reject: {
      title: "Request Rejected",
      lines: [
        "You’ve rejected this request.",
        "The requestor has been notified and can revise or withdraw.",
      ],
      color: "red",
      iconPath: "M6 18L18 6M6 6l12 12",
    },
    request_clarification: {
      title: "Clarification Requested",
      lines: [
        "You asked for more information.",
        "The requestor will reply as soon as possible.",
      ],
      color: "yellow",
      iconPath: "M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z",
    },
    save: {
      title: "Draft Saved",
      lines: ["Your comments have been saved."],
      color: "blue",
      iconPath: "M12 4v16m8-8H4",
    },
  };

  const outcome = config[action] ?? {
    title: "Action Complete",
    lines: ["Your action has been recorded."],
    color: "gray",
    iconPath: "M12 2a10 10 0 100 20 10 10 0 000-20z",
  };

  // Resend mutation for the "accept" case:
  const resendMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const form = new FormData();
      form.append("resend", "true");
      const res = await fetchApi(`/drt/owner_review/${link_id}/`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Resend failed");
    },
    retry: 1,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["ownerReview", link_id, "result"] }),
  });
  const isResending = resendMutation.status === "pending";

  return (
    <Providers>
      <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <section className="bg-white w-full max-w-sm p-8 rounded-xl shadow-lg text-center space-y-6">
          {action === "reject" && !submitted ? (
            <>
              <h2 className="text-xl font-semibold text-red-700">
                Provide Rationale for Denial
              </h2>
              <textarea
                rows={4}
                placeholder="Why are you denying this request?"
                className="w-full border border-red-300 rounded p-2"
                value={rationale}
                onChange={(e) => {
                  setRationale(e.target.value);
                  setError(null);
                }}
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                disabled={isSubmitting}
                onClick={() => {
                  if (!rationale.trim()) {
                    setError("Rationale is required.");
                    return;
                  }
                  rationaleMutation.mutate(rationale);
                }}
                className={`w-full px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isSubmitting ? "Submitting…" : "Submit Denial"}
              </button>
            </>
          ) : (
            <>
              {/* Icon */}
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-${outcome.color}-100`}
              >
                <svg
                  className={`h-8 w-8 text-${outcome.color}-600`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d={outcome.iconPath}
                  />
                </svg>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-semibold text-gray-800">
                {outcome.title}
              </h1>

              {/* Message */}
              <div className="space-y-2 text-gray-600">
                {outcome.lines.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>

              {/* Resend button for “accept” */}
              {action === "accept" && (
                <div className="space-y-2">
                  <button
                    onClick={() => resendMutation.mutate()}
                    disabled={isResending}
                    className={`w-full px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                      isResending
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-yellow-500 hover:bg-yellow-600"
                    }`}
                  >
                    {isResending ? "Resending…" : "Didn’t get it? Resend Email"}
                  </button>
                  {resendMutation.isError && (
                    <p className="text-red-600">
                      {resendMutation.error?.message}
                    </p>
                  )}
                  {resendMutation.isSuccess && (
                    <p className="text-green-600">
                      ✅ Email resent! Please check your inbox.
                    </p>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col gap-3">
                <Link
                  href="/negotiation/owner/list"
                  className={`block rounded-lg px-4 py-2 font-medium text-white bg-${outcome.color}-600 hover:bg-${outcome.color}-700 transition`}
                >
                  View All Requests
                </Link>
                <button
                  onClick={() => router.push("/negotiation/owner/homepage")}
                  className="block rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Back to Home
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </Providers>
  );
}
