// app/negotiation/[link_id]/request-access.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

async function fetchAccessLink(linkId: string): Promise<string> {
  const res = await fetchApi(`/drt/request_access/${linkId}/`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to request access");
  return `/negotiation/${linkId}/fill-questionnaire`;
}

export default function RequestAccessPage() {
  const { link_id: linkId } = useParams<{ link_id: string }>();
  const router = useRouter();

  const {
    data: accessLink,
    isLoading,
    isError,
    error,
  } = useQuery<string, Error>({
    queryKey: ["requestAccess", linkId],
    queryFn: () => fetchAccessLink(linkId!),
    enabled: !!linkId,
    retry: false,
  });

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <section className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg text-center space-y-6">

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-800">
          New Request Started
        </h1>

        {/* Body */}
        {isLoading ? (
          <p className="text-gray-600">Requesting access link…</p>
        ) : isError ? (
          <p className="text-red-600">{error.message}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700">
              Click the button below to begin the questionnaire:
            </p>
            <button
              onClick={() => router.push(accessLink!)}
              className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white font-medium transition hover:bg-blue-700"
            >
              Start Questionnaire
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
