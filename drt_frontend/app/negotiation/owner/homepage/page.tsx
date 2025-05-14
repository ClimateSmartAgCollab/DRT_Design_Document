//drt_frontend/app/negotiation/owner/homepage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import fetchApi from "@/app/api/apiHelper";

export default function OwnerHomePage() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [email, router]);

  useEffect(() => {
    if (!email) return;

    // only load once per browser session
    if (sessionStorage.getItem("cacheLoaded")) {
      setLoading(false);
      return;
    }

    async function loadCache() {
      try {
        const res = await fetchApi("/datastore/load-data/");
        if (!res.ok) throw new Error("Cache load failed");
        sessionStorage.setItem('cacheLoaded', 'true')
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCache();
  }, [email]);

  if (!email) {
    // avoid flash of homepage while redirecting
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        Error: {error}
      </div>
    );
  }

  const ownerPages = [
    {
      name: "My Links",
      href: `/negotiation/owner/links?email=${encodeURIComponent(email)}`,
      emoji: "🔗",
    },
    {
      name: "Negotiation List",
      href: `/negotiation/owner/list?email=${encodeURIComponent(email)}`,
      emoji: "📋",
    },
    {
      name: "Archive Negotiation",
      href: "/drt/negotiations/archive/<id>",
      emoji: "🗄️",
    },
    {
      name: "Delete Negotiation",
      href: "/drt/negotiations/delete/<id>",
      emoji: "🗑️",
    },
    {
      name: "Delete Old Negotiations",
      href: "/drt/negotiations/delete-old",
      emoji: "⌛",
    },
    {
      name: "Summary Statistics",
      href: "/drt/summary-statistics/<owner_id>",
      emoji: "📊",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-10">
        <h1 className="text-4xl font-extrabold text-center text-gray-800">
          Owner Dashboard
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {ownerPages.map(({ name, href, emoji }) => (
            <Link key={href} href={href} className="group">
              <div
                className="
                bg-white rounded-2xl shadow-lg p-6
                flex flex-col items-center text-center
                transform transition
                hover:shadow-2xl hover:-translate-y-1
              "
              >
                <div className="text-5xl mb-3 transition group-hover:scale-110">
                  {emoji}
                </div>
                <span
                  className="
                  text-lg font-medium text-gray-700
                  group-hover:text-gray-900
                "
                >
                  {name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
