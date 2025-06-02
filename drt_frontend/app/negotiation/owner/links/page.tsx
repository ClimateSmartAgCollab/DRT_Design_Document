// drt_frontend\app\negotiation\owner\links\page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";

type LinkEntry = {
  url: string;
  questionnaireId: string;
  licenseId: string;
  expiry: string;
  label: string; // your data_label
  tags: string; // your tag
};

export default function OwnerLinks() {
  const router = useRouter();
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLinks() {
      try {
        const res = await fetchApi("/drt/owner/links/", {
          method: "GET",
        });

        if (res.status === 401) {
          // Not authenticated → redirect to email‐entry/OTP page
          router.replace("/negotiation/owner/email-entry");
          return;
        }

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          setError(errJson.error || `Unexpected status ${res.status}`);
          setLoading(false);
          return;
        }

        const data = (await res.json()) as { links: LinkEntry[] };
        setLinks(data.links);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load links from server");
        setLoading(false);
      }
    }

    loadLinks();
  }, [router]);

  if (loading) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <p>Loading your links…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <p className="text-red-500">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Your Link Library</h1>

        {links.length === 0 ? (
          <p>No links found for your account.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {links.map(
              ({ url, tags, label, questionnaireId, licenseId, expiry }) => (
                <div
                  key={`${url}-${questionnaireId}`}
                  className="
                  bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between
                  transform transition hover:shadow-2xl hover:-translate-y-1
                "
                >
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">
                    {label}
                    {tags ? ` (${tags})` : ""}
                  </h2>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>
                      <span className="font-medium">Questionnaire:</span>{" "}
                      <code>{questionnaireId}</code>
                    </p>
                    <p>
                      <span className="font-medium">License ID:</span>{" "}
                      <code>{licenseId}</code>
                    </p>
                    <p>
                      <span className="font-medium">Expires:</span>{" "}
                      <time>{expiry}</time>
                    </p>
                    <p>
                      <span className="font-medium">url:</span>{" "}
                      <time>{url}</time>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                      flex-1 text-center py-2
                      bg-blue-600 text-white rounded-lg
                      hover:bg-blue-700 transition
                    "
                    >
                      Visit
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(url)}
                      className="
                      flex-1 py-2 bg-gray-200 rounded-lg
                      hover:bg-gray-300 transition
                    "
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
