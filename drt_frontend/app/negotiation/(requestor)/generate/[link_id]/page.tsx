// app/negotiation/generate-link/[link_id]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import fetchApi from '@/app/api/apiHelper';


async function generateLinkApi(linkId: string): Promise<string> {
  const res = await fetchApi(`/drt/generate_nlinks/${linkId}/`);
  const data = await res.json();
  if (!res.ok || !data.requestor_link_id) {
    throw new Error(data.error || "Failed to generate link");
  }
  return data.requestor_link_id as string;
}

export default function GenerateLinkPage() {
  const { link_id: linkId } = useParams<{ link_id: string }>();
  const router = useRouter();

  const [redirecting, setRedirecting] = useState(false);

  const { mutate, isPending, isError, error } = useMutation<string, Error, void>(
    {
      mutationFn: () => generateLinkApi(linkId!),
      onSuccess: (requestorLinkId: string) => {
        setRedirecting(true);
        router.push(`/negotiation/${requestorLinkId}/email-entry`);
      },
    }
  );

  const loading = isPending || redirecting;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <section className="bg-white w-full max-w-sm p-6 rounded-xl shadow-lg text-center space-y-6">

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-800">
          Start a New Data Request
        </h1>

        {/* Body */}
        {loading ? (
          <p className="text-gray-600">Generating link…</p>
        ) : isError ? (
          <p className="text-red-600">{error.message}</p>
        ) : (
          <button
            onClick={() => mutate()}
            className="inline-block w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium transition hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isPending}
          >
            {isPending ? "Generating…" : "Generate Access Link"}
          </button>
        )}
      </section>
    </main>
  );
}

