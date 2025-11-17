// drt_frontend/app/negotiation/(requestor)/homepage/page.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import React, { useState } from "react";
import Header from "@/app/components/Header";

type WhoamiResponse = {
  email: string;
};

type LoadResponse = {
  status: string;
  data?: any;
};

async function fetchWhoami(): Promise<WhoamiResponse> {
  const res = await fetchApi("/drt/requestor/whoami/", {
    credentials: "include", // ensure cookies (session/token) are sent
  });
  if (!res.ok) {
    throw new Error("Not authenticated");
  }
  return res.json();
}

async function fetchLoadData(): Promise<LoadResponse> {
  const res = await fetchApi("/datastore/load-data/");
  if (!res.ok) {
    // try to extract a JSON error if available
    let msg = res.statusText;
    try {
      const errBody = await res.json();
      msg = errBody.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export default function RequestorHomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const whoamiQuery = useQuery({
    queryKey: ["requestor", "whoami"],
    queryFn: fetchWhoami,
    retry: false,
  });

  React.useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  const loadDataQuery = useQuery<LoadResponse, Error>({
    queryKey: ["datastore", "load-data"],
    queryFn: fetchLoadData,
    enabled: !!whoamiQuery.data, // wait for whoami
    retry: 1, // retry once
    staleTime: Infinity, // keep in cache for session
  });

  // handle error side effects
  React.useEffect(() => {
    if (loadDataQuery.isError) {
      console.error("Failed to load cache data:", loadDataQuery.error);
    }
  }, [loadDataQuery.isError, loadDataQuery.error]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi('/drt/requestor/logout/', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/negotiation/email-entry');
    },
    onError: (error) => {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      // Still redirect even if logout fails
      router.push('/negotiation/email-entry');
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };

  if (whoamiQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading requestor…
      </div>
    );
  }
  // whoamiQuery.onError already redirected, so we can bail silently:
  if (whoamiQuery.isError || !whoamiQuery.data) {
    return null;
  }

  if (loadDataQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading cache…
      </div>
    );
  }
  if (loadDataQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        Error: {loadDataQuery.error.message}
      </div>
    );
  }

  const email = (whoamiQuery.data as unknown as WhoamiResponse).email;

  // ender the dashboard
  const requestorPages = [
    { name: "Negotiation List", href: `/negotiation/list`, emoji: "📋" },
    // {
    //   name: "Summary Statistics",
    //   href: `/negotiation/summary?requestor=${encodeURIComponent(email)}`,
    //   emoji: "📊",
    // },
  ];

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <Header
          title="Requestor Dashboard"
          homepageLink={{
            href: "/negotiation/homepage",
            onClick: () => router.push("/negotiation/homepage"),
          }}
          userDropdown={{
            email: email || "",
            role: "requestor",
            isLoading: whoamiQuery.isLoading,
            isLoggingOut: isLoggingOut,
            onLogout: handleLogout,
          }}
        />

        <div className="flex flex-col items-center w-full px-2 sm:px-4 py-6 sm:py-8 md:py-10">
          <div className="max-w-3xl w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {requestorPages.map(({ name, href, emoji }) => (
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
        </div>
      </main>
    </Providers>
  );
}
