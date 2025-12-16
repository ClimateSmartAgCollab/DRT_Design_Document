"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useNegotiations } from "./hooks/useNegotiations";
import { useFilterState } from "./hooks/useFilterState";
import { Sidebar } from "./components/Sidebar";
import { BulkActionBar } from "./components/BulkActionBar";
import { NegotiationItem } from "./components/NegotiationItem";
import {
  deleteNegotiation,
} from "./services/negotiationApi";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import Header from "@/app/components/Header";

export default function OwnerNegotiationListContent() {
  const router = useRouter();
  const qc = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<string[]>([]);
  const [selectedRecordLabel, setSelectedRecordLabel] = useState<string[]>([]);

  // Use the new filter state hook
  const {
    filters,
    setSearchTerm,
    toggleStatus,
    setArchivedFilter,
    setDateRange,
    setSortOption,
    resetFilters,
  } = useFilterState();

  // Build filters object for API call
  const apiFilters = useMemo(() => ({
    page: currentPage,
    pageSize: 10,
    status: filters.statusFilter.length > 0 ? filters.statusFilter : undefined,
    archived: filters.archivedFilter !== "all" ? filters.archivedFilter : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    tags: selectedTag.length > 0 ? selectedTag : undefined,
    recordLabel: selectedRecordLabel.length > 0 ? selectedRecordLabel : undefined,
    search: filters.searchTerm || undefined,
    sort: filters.sortOption !== "created_desc" ? filters.sortOption : undefined,
  }), [currentPage, filters, selectedTag, selectedRecordLabel]);

  const { data: negs, error, isLoading, reload, total, totalPages, page } = useNegotiations(apiFilters);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    negs.forEach(n => {
      if (Array.isArray(n.tags)) n.tags.forEach(t => t && tags.add(t));
      else if (typeof n.tags === 'string' && n.tags) tags.add(n.tags);
    });
    return Array.from(tags);
  }, [negs]);
  const recordLabelOptions = useMemo(() => {
    const labels = new Set<string>();
    negs.forEach(n => {
      if (n.record_label) labels.add(n.record_label);
    });
    return Array.from(labels);
  }, [negs]);

  const deleteOne = useMutation({
    mutationFn: (id: string) => deleteNegotiation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["negotiations"] }),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi('/drt/owner/logout/', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      qc.clear();
      router.push('/negotiation/owner/email-entry');
    },
    onError: (error) => {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      // Still redirect even if logout fails
      router.push('/negotiation/owner/email-entry');
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };
  // const deleteOld = useMutation({
  //   mutationFn: deleteOldNegotiations,
  //   onSuccess: () => qc.invalidateQueries({ queryKey: ["negotiations"] }),
  // });

  const handleToggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const deleteSelected = async () => {
    if (!selected.size) return;
    try {
      setIsBulkDeleting(true);
      await Promise.all(
        Array.from(selected).map((id) => deleteOne.mutateAsync(id))
      );
      setSelected(new Set());
    } catch (error) {
      console.error('Error deleting negotiations:', error);
      alert('Failed to delete some negotiations. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const displayedNegs = negs;

  // const hasOld = negs.some(
  //   (n) =>
  //     Date.now() - new Date(n.timestamps).getTime() > 30 * 24 * 60 * 60 * 1000
  // );

  const whoamiQuery = useQuery({
    queryKey: ["owner", "whoami"],
    queryFn: async () => {
      const res = await fetchApi("/drt/owner/whoami/");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.statusFilter, filters.archivedFilter, filters.startDate, filters.endDate, filters.searchTerm, filters.sortOption, selectedTag, selectedRecordLabel]);

  // Sync currentPage with API response page
  useEffect(() => {
    if (page && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [page, currentPage]);

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <Header
          title="Negotiation List"
          homepageLink={{
            href: "/negotiation/owner/homepage",
            onClick: () => router.push("/negotiation/owner/homepage"),
          }}
          userDropdown={{
            email: whoamiQuery.data?.email || "",
            role: "owner",
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
              tagOptions={tagOptions}
              selectedTag={selectedTag}
              onTagChange={setSelectedTag}
              recordLabelOptions={recordLabelOptions}
              selectedRecordLabel={selectedRecordLabel}
              onRecordLabelChange={setSelectedRecordLabel}
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
              {isLoading && (
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

              {!isLoading && !error && displayedNegs.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No negotiations found.</p>
                </div>
              )}

              <BulkActionBar
                selectedCount={selected.size}
                onDeleteSelected={deleteSelected}
                isDeleting={isBulkDeleting}
              />

              {!isLoading && !error && displayedNegs.length > 0 && (
                <>
                  <ul className="space-y-4">
                    {displayedNegs.map((n) => (
                      <NegotiationItem
                        key={n.negotiation_id}
                        negotiation={n}
                        isSelected={selected.has(n.negotiation_id)}
                        onToggleSelect={handleToggleSelect}
                        onReload={reload}
                      />
                    ))}
                  </ul>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                      <div className="text-sm text-gray-700">
                        Showing page {currentPage} of {totalPages} ({total} total negotiations)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1 || isLoading}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage >= totalPages || isLoading}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </main>
    </Providers>
  );
} 