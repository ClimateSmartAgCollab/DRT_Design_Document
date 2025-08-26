"use client";
import React, { useMemo } from "react";
import { useNegotiations } from "./hooks/useNegotiations";
import { useFilterState } from "./hooks/useFilterState";
import { useSelection } from "./hooks/useSelection";
import { useBulkDeleteNegotiations } from "./hooks/useBulkDeleteNegotiations";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Status } from "./types";
import { Sidebar } from "./components/Sidebar";
import { BulkActionBar } from "./components/BulkActionBar";
import { NegotiationItem } from "./components/NegotiationItem";
import { deleteOldNegotiations } from "./services/negotiationApi";
import fetchApi from "@/app/api/apiHelper";
import NegotiationLayout from "@/app/components/NegotiationLayout";

export default function NegotiationListContent() {
  const router = useRouter();
  const { data: negs, error, reload, isFetching } = useNegotiations();
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

  const deleteOld = useMutation({
    mutationFn: () => deleteOldNegotiations(),
    onSuccess: () => { reload(); },
  });

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
        n.conversation_id.toLowerCase().includes(txt);
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

  const hasOld = negs.some(
    (n) => Date.now() - new Date(n.timestamps).getTime() > 30 * 24 * 60 * 60 * 1000
  );

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

  return (
    <NegotiationLayout
      userType="requestor"
      userEmail={whoamiQuery.data?.email}
      isLoading={whoamiQuery.isLoading}
      pageTitle="Negotiation List"
    >
      <div className="w-full">
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar
            searchTerm={filters.searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={filters.statusFilter}
            onToggleStatus={toggleStatus}
            archivedFilter={filters.archivedFilter}
            startDate={filters.startDate}
            endDate={filters.endDate}
            onDateChange={setDateRange}
            sortOption={filters.sortOption}
            onSortChange={setSortOption}
            onReset={resetFilters}
          />
          <main className="flex-1 p-8">
            {/* <button
              onClick={() => router.push("/negotiation/homepage")}
              className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            >
              Back to homepage
            </button> */}
            {/* <h1 className="text-2xl font-extrabold mb-2 text-gray-800 flex items-center">
              Negotiations ({sorted.length})
              {isFetching && !whoamiQuery.isLoading && (
                <div className="ml-3 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Updating...</span>
                </div>
              )}
            </h1> */}
            
            {whoamiQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            
            {hasOld && (
              <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <p className="text-gray-700">
                  There are negotiations older than 30 days.
                  <button
                    onClick={() => deleteOld.mutate()}
                    className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                  >
                    Delete Old
                  </button>
                </p>
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
    </NegotiationLayout>
  );
} 