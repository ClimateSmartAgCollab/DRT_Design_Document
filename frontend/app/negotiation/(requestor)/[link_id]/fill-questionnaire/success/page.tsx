// app/negotiation/[link_id]/fill-questionnaire/success/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FillSuccessPage() {
  const router = useRouter();

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <section className="bg-white w-full max-w-sm p-8 rounded-xl shadow-lg text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
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
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Headline */}
        <h1 className="mb-4 text-2xl font-semibold text-gray-800">
          Request Submitted
        </h1>

        {/* Description */}
        <p className="mb-6 text-gray-600">
          Thank you! Your data request has been submitted. You will be notified
          once the data owner reviews it.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href={`/negotiation/list`}
            className="inline-block rounded-lg bg-green-600 px-4 py-2 text-white font-medium transition hover:bg-green-700"
          >
            View My Requests
          </Link>

          <button
            onClick={() => router.push("/negotiation/homepage")}
            className="inline-block rounded-lg border border-gray-300 px-4 py-2 text-gray-700 font-medium transition hover:bg-gray-100"
          >
            Back to Home
          </button>
        </div>
      </section>
    </main>
  );
}
