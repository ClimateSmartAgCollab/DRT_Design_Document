// drt_frontend/app/negotiation/owner/[link_id]/result/[action]/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";

export default function OutcomePage() {
  const { link_id, action } = useParams<{
    link_id: string;
    action: string;
  }>();
  const qc = useQueryClient();

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

  const config: Record<string, { title: string; lines: string[] }> = {
    accept: {
      title: "Thank you!",
      lines: [
        "Your acceptance has been recorded.",
        "Please check your email for the license agreement files.",
      ],
    },
    reject: {
      title: "Request Rejected",
      lines: [
        "You’ve rejected this request.",
        "The requestor has been notified and can revise or withdraw.",
      ],
    },
    request_clarification: {
      title: "Clarification Requested",
      lines: [
        "You asked for more information.",
        "The requestor will reply as soon as possible.",
      ],
    },
    save: {
      title: "Draft Saved",
      lines: ["Your comments have been saved."],
    },
  };

  const outcome =
    config[action] ?? {
      title: "Action Complete",
      lines: ["Your action has been recorded."],
    };

  return (
    <Providers>
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md text-center space-y-4">
          {/* Title */}
          <h1 className="text-2xl font-bold">{outcome.title}</h1>

          {/* Message lines */}
          {outcome.lines.map((text, idx) => (
            <p key={idx} className="text-gray-700">
              {text}
            </p>
          ))}

          {/* Resend button only for “accept” */}
          {action === "accept" && (
            <>
              <button
                onClick={() => resendMutation.mutate()}
                disabled={isResending}
                className={`mt-2 inline-block px-4 py-2 rounded text-white font-semibold transition-colors duration-200 ${
                  isResending
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-yellow-500 hover:bg-yellow-600"
                }`}
              >
                {isResending ? "Resending…" : "Didn’t get it? Resend Email"}
              </button>
              {resendMutation.isError && (
                <p className="mt-2 text-red-600">
                  {resendMutation.error?.message || "Resend error."}
                </p>
              )}
              {resendMutation.isSuccess && (
                <p className="mt-2 text-green-600">
                  ✅ Email resent! Please check your inbox.
                </p>
              )}
            </>
          )}

          {/* Back link */}
          <Link
            href="/negotiation/owner/list"
            className="mt-4 inline-block text-blue-600 underline"
          >
            ← Back to all requests
          </Link>
        </div>
      </div>
    </Providers>
  );
}
