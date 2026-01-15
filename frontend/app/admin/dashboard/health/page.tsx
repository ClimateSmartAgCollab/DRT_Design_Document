"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import Header from "@/app/components/Header";
import { fetchAdminHealth, AdminHealth } from "../../api/adminApi";

export default function AdminHealthPage() {
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

  const healthQuery = useQuery<AdminHealth, Error>({
    queryKey: ["admin", "health"],
    queryFn: fetchAdminHealth,
    enabled: !!whoamiQuery.data,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // Refetch every minute
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

  if (whoamiQuery.isLoading || healthQuery.isLoading) {
    return (
      <Providers>
        <main className="min-h-dvh bg-white flex flex-col">
          <Header
            title="System Health"
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
            Loading health status...
          </div>
        </main>
      </Providers>
    );
  }

  if (whoamiQuery.isError || !whoamiQuery.data) {
    return null;
  }

  if (healthQuery.isError) {
    return (
      <Providers>
        <main className="min-h-dvh bg-white flex flex-col">
          <Header
            title="System Health"
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
            Error: {healthQuery.error?.message || "Failed to load health status"}
          </div>
        </main>
      </Providers>
    );
  }

  const email = (whoamiQuery.data as any).email;
  const health = healthQuery.data!;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'unhealthy':
        return '✗';
      case 'degraded':
        return '⚠';
      default:
        return '?';
    }
  };

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        <Header
          title="System Health"
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
            {/* Overall Status */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Overall System Status</h2>
                <span className={`px-4 py-2 rounded-full font-medium ${getStatusColor(health.status)}`}>
                  {getStatusIcon(health.status)} {health.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Health Checks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(health.checks).map(([checkName, checkData]) => (
                <div key={checkName} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {checkName.replace('_', ' ')}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(checkData.status)}`}>
                      {getStatusIcon(checkData.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{checkData.message}</p>
                  {'host' in checkData && (checkData as { host?: string }).host && (
                    <p className="text-xs text-gray-500 mt-1">Host: {(checkData as { host?: string }).host}</p>
                  )}
                  {'count' in checkData && (checkData as { count?: number }).count !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">Count: {(checkData as { count?: number }).count}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </Providers>
  );
}
