"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import NegotiationLayout from "@/app/components/NegotiationLayout";

type LinkEntry = {
  url: string;
  questionnaireId: string;
  licenseId: string;
  expiry: string;
  label: string;
  tags: string;
  recordLabel: string;
};

async function fetchOwnerLinks(): Promise<LinkEntry[]> {
  const res = await fetchApi("/drt/owner/links/");
  if (res.status === 401) throw new Error("Not authenticated");
  if (!res.ok) {
    let errMsg = `Unexpected status ${res.status}`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  const data = (await res.json()) as { links: LinkEntry[] };
  return data.links;
}

export default function OwnerLinks() {
  const router = useRouter();
  
  // Authentication check
  const whoamiQuery = useQuery({
    queryKey: ["owner", "whoami"],
    queryFn: async () => {
      const res = await fetchApi("/drt/owner/whoami/");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  const {
    data: links,
    error,
    isLoading,
    isError,
  } = useQuery<LinkEntry[], Error>({
    queryKey: ["owner", "links"],
    queryFn: fetchOwnerLinks,
    retry: 0,
    staleTime: Infinity,
    enabled: !!whoamiQuery.data, // Only fetch links if authenticated
  });

  useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  useEffect(() => {
    if (isError && error?.message === "Not authenticated") {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [isError, error, router]);

  if (whoamiQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading owner…
      </div>
    );
  }

  if (whoamiQuery.isError || !whoamiQuery.data) {
    return null;
  }

  if (isLoading) {
    return (
      <NegotiationLayout
        userType="owner"
        userEmail={whoamiQuery.data.email}
        isLoading={false}
        pageTitle="My Links"
      >
        <div className="max-w-md mx-auto">
          <p>Loading your links…</p>
        </div>
      </NegotiationLayout>
    );
  }

  if (isError) {
    return (
      <NegotiationLayout
        userType="owner"
        userEmail={whoamiQuery.data.email}
        isLoading={false}
        pageTitle="My Links"
      >
        <div className="max-w-md mx-auto">
          <p className="text-red-500">{error?.message}</p>
        </div>
      </NegotiationLayout>
    );
  }

  return (
    <Providers>
      <NegotiationLayout
        userType="owner"
        userEmail={whoamiQuery.data.email}
        isLoading={false}
        pageTitle="My Links"
      >
        <div className="max-w-4xl w-full space-y-6">
          {/* <button
            onClick={() => router.push("/negotiation/owner/homepage")}
            className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            ← Back to homepage
          </button> */}

          {/* <h1 className="text-3xl font-bold text-gray-800">
            Your Link Library
          </h1> */}

          {links && links.length === 0 ? (
            <p>No links found for your account.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {links?.map((link) => (
                <div
                  key={`${link.url}-${link.questionnaireId}`}
                  className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl transition-transform transform hover:-translate-y-1"
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-red-800 break-words">
                      {link.recordLabel}
                    </h2>
                    <p className="text-lg text-gray-700 break-words">
                      {link.label}
                      {link.tags ? ` (${link.tags})` : ""}
                    </p>
                  </div>

                  <div className="text-sm text-gray-600 space-y-2 mb-6">
                    <p>
                      <span className="font-medium">Questionnaire:</span>{" "}
                      <code className="break-all bg-gray-100 px-1 rounded">
                        {link.questionnaireId}
                      </code>
                    </p>
                    <p>
                      <span className="font-medium">License ID:</span>{" "}
                      <code className="break-all bg-gray-100 px-1 rounded">
                        {link.licenseId}
                      </code>
                    </p>
                    <p>
                      <span className="font-medium">Expires:</span>{" "}
                      <time className="whitespace-nowrap">{link.expiry}</time>
                    </p>
                    <p>
                      <span className="font-medium">URL:</span>{" "}
                      <code className="break-all bg-gray-100 px-1 rounded">
                        {link.url}
                      </code>
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Visit
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(link.url)}
                      className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </NegotiationLayout>
    </Providers>
  );
}
