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
};

export default function OwnerLinks() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const router = useRouter();

  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      router.replace("/negotiation/owner/email-entry");
      return;
    }

    async function loadLinks() {
      try {
        // 1. Fetch and parse owner_table
        const ownerRes = await fetchApi(
          "/datastore/get_cached_data/owner_table"
        );
        const { owner_table } = (await ownerRes.json()) as {
          owner_table: Record<
            string,
            { username: string; owner_email: string }
          >;
        };

        // 2. Find the matching owner_id(s)
        const ownerIds = Object.entries(owner_table)
          .filter(([, owner]) => owner.owner_email === email)
          .map(([owner_id]) => owner_id);

        if (ownerIds.length === 0) {
          setLinks([]);
          return;
        }

        // 3. Fetch and parse link_table
        const linkRes = await fetchApi("/datastore/get_cached_data/link_table");
        const { link_table } = (await linkRes.json()) as {
          link_table: Record<
            string,
            {
              questionnaire_id: string;
              license_id: string;
              owner_id: string;
              expiry: string;
              data_label: string;
            }
          >;
        };

        // 4. Filter by owner_id and map to LinkEntry[]
        const entries: LinkEntry[] = Object.entries(link_table)
          .filter(([, row]) => ownerIds.includes(row.owner_id))
          .map(([link, row]) => ({
            url: link,
            questionnaireId: row.questionnaire_id,
            licenseId: row.license_id,
            expiry: row.expiry || "Never",
            label: row.data_label,
          }));

        setLinks(entries);
      } catch (err) {
        console.error(err);
        setError("Failed to load links from cache");
      }
    }

    loadLinks();
  }, [email, router]);

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
          <p>
            No links found for <strong>{email}</strong>.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {links.map(({ url, label, questionnaireId, licenseId, expiry }) => (
              <div
                key={`${url}-${questionnaireId}`}
                className="
                  bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between
                  transform transition hover:shadow-2xl hover:-translate-y-1
                "
              >
                <h2 className="text-xl font-semibold mb-2 text-gray-800">
                  {label}
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
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
