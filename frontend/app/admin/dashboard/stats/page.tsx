"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import Header from "@/app/components/Header";
import { fetchAdminStats, AdminStats } from "../../api/adminApi";

export default function AdminStatsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const whoamiQuery = useQuery({
    queryKey: ["admin", "whoami"],
    queryFn: async () => {
      const res = await fetchApi("/drt/admin/whoami/");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  const statsQuery = useQuery<AdminStats, Error>({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    enabled: !!whoamiQuery.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  React.useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/admin/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi('/drt/admin/logout/', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/admin/email-entry');
    },
    onError: (error) => {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      router.push('/admin/email-entry');
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };

  if (whoamiQuery.isLoading || statsQuery.isLoading) {
    return (
      <Providers>
        <main className="min-h-dvh bg-white flex flex-col">
          <Header
            title="System Statistics"
            homepageLink={{
              href: "/admin/homepage",
              onClick: () => router.push("/admin/homepage"),
            }}
            userDropdown={{
              email: "",
              role: "admin",
              isLoading: true,
              isLoggingOut: false,
              onLogout: handleLogout,
            }}
          />
          <div className="flex items-center justify-center min-h-screen text-gray-600">
            Loading statistics...
          </div>
        </main>
      </Providers>
    );
  }

  if (whoamiQuery.isError || !whoamiQuery.data) {
    return null;
  }

  if (statsQuery.isError) {
    return (
      <Providers>
        <main className="min-h-dvh bg-white flex flex-col">
          <Header
            title="System Statistics"
            homepageLink={{
              href: "/admin/homepage",
              onClick: () => router.push("/admin/homepage"),
            }}
            userDropdown={{
              email: (whoamiQuery.data as any).email || "",
              role: "admin",
              isLoading: false,
              isLoggingOut: isLoggingOut,
              onLogout: handleLogout,
            }}
          />
          <div className="flex items-center justify-center min-h-screen text-red-600">
            Error: {statsQuery.error?.message || "Failed to load statistics"}
          </div>
        </main>
      </Providers>
    );
  }

  const email = (whoamiQuery.data as any).email;
  const stats = statsQuery.data!;

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        <Header
          title="System Statistics"
          homepageLink={{
            href: "/admin/homepage",
            onClick: () => router.push("/admin/homepage"),
          }}
          userDropdown={{
            email: email || "",
            role: "admin",
            isLoading: false,
            isLoggingOut: isLoggingOut,
            onLogout: handleLogout,
          }}
        />

        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[rgb(70,160,35)]">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Total Negotiations
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.statistics.total_negotiations}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[rgb(70,160,35)]">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Total Owners
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.statistics.total_owners}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[rgb(70,160,35)]">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Total Requestors
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.statistics.total_requestors}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[rgb(70,160,35)]">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  Active Data Sharing Links
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.statistics.total_datasets}
                </div>
              </div>
            </div>

            {/* Negotiation States */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Negotiation States
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(stats.statistics.negotiation_states).map(([state, count]) => (
                  <div key={state} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      {state.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Recent Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Negotiations (Last 30 Days)
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.statistics.recent_activity.negotiations_last_30_days}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">
                    Last Updated
                  </div>
                  <div className="text-sm text-gray-700">
                    {new Date(stats.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Providers>
  );
}
