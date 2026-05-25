"use client";
import React, { useMemo, useState } from "react";
import { useNegotiations } from "./hooks/useNegotiations";
import { useFilterState } from "./hooks/useFilterState";
import { useSelection } from "./hooks/useSelection";
import { useBulkDeleteNegotiations } from "./hooks/useBulkDeleteNegotiations";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Status } from "./types";
import { Sidebar } from "./components/Sidebar";
import { BulkActionBar } from "./components/BulkActionBar";
import { NegotiationItem } from "./components/NegotiationItem";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import Header from "@/app/components/Header";

export default function NegotiationListContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: negs, error, reload } = useNegotiations();
  const {
    filters,
    setSearchTerm,
    toggleStatus,
    setArchivedFilter,
    setDateRange,
    setSortOption,
    resetFilters,
  } = useFilterState();
  const { selected, toggleSelect, clearSelection } = useSelection<string>();
  const { deleteSelected } = useBulkDeleteNegotiations();

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

  const handleDeleteSelected = async () => {
    await deleteSelected(Array.from(selected), clearSelection);
  };

  const filtered = useMemo(() => {
    return negs.filter((n) => {
      const created = new Date(n.timestamps);
      const txt = filters.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !txt ||
        n.negotiation_id.toLowerCase().includes(txt) ||
        n.conversation_id.toLowerCase().includes(txt) ||
        (n.visible_label && n.visible_label.toLowerCase().includes(txt)) ||
        (n.record_label && n.record_label.toLowerCase().includes(txt));
      const matchesStatus =
        filters.statusFilter.length === 0 || filters.statusFilter.includes(n.state as Status);
      const matchesArchived =
        filters.archivedFilter === "all" ||
        (filters.archivedFilter === "archived" && n.archived) ||
        (filters.archivedFilter === "active" && !n.archived);
      const afterStart = !filters.startDate || created >= new Date(filters.startDate);
      const beforeEnd = !filters.endDate || created <= new Date(filters.endDate);
      return (
        matchesSearch &&
        matchesStatus &&
        matchesArchived &&
        afterStart &&
        beforeEnd
      );
    });
  }, [negs, filters.searchTerm, filters.statusFilter, filters.archivedFilter, filters.startDate, filters.endDate]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (filters.sortOption) {
        case "created_asc":
          return new Date(a.timestamps).getTime() - new Date(b.timestamps).getTime();
        case "created_desc":
          return new Date(b.timestamps).getTime() - new Date(a.timestamps).getTime();
        case "status_asc":
          return a.state.localeCompare(b.state);
        case "status_desc":
          return b.state.localeCompare(a.state);
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, filters.sortOption]);

  // Authentication check
  const whoamiQuery = useQuery({
    queryKey: ["requestor", "whoami"],
    queryFn: async () => {
      const res = await fetchApi("/drt/requestor/whoami/");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });
  React.useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  // Refresh page data when component mounts to ensure latest data
  React.useEffect(() => {
    reload();
  }, [reload]);

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <Header
          title="Negotiation List"
          homepageLink={{
            href: "/negotiation/homepage",
            onClick: () => router.push("/negotiation/homepage"),
          }}
          userDropdown={{
            email: whoamiQuery.data?.email || "",
            role: "requestor",
            isLoading: whoamiQuery.isLoading,
            isLoggingOut: isLoggingOut,
            onLogout: handleLogout,
          }}
        />

        <div className="w-full overflow-x-hidden">
          <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
            <Sidebar
              searchTerm={filters.searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={filters.statusFilter}
              onToggleStatus={toggleStatus}
              archivedFilter={filters.archivedFilter}
              onArchivedChange={setArchivedFilter}
              startDate={filters.startDate}
              endDate={filters.endDate}
              onDateChange={setDateRange}
              sortOption={filters.sortOption}
              onSortChange={setSortOption}
              onReset={resetFilters}
            />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
              {whoamiQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(70,160,35)]"></div>
                  <span className="ml-3 text-gray-600">Loading negotiations...</span>
                </div>
              )}
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded">
                  <p className="text-red-600">Error loading negotiations: {error}</p>
                  <button
                    onClick={() => reload()}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!whoamiQuery.isLoading && !error && sorted.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Please Waite.</p>
                </div>
              )}

              <BulkActionBar
                selectedCount={selected.size}
                onDeleteSelected={handleDeleteSelected}
              />
              <ul className="space-y-4">
                {sorted.map((n) => (
                  <NegotiationItem
                    key={n.negotiation_id}
                    negotiation={n}
                    isSelected={selected.has(n.negotiation_id)}
                    onToggleSelect={toggleSelect}
                    onReload={reload}
                  />
                ))}
              </ul>
            </main>
          </div>
        </div>
      </main>
    </Providers>
  );
} 