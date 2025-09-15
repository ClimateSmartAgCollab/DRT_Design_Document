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
import { deleteOldNegotiations } from "./services/negotiationApi";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";
import Image from "next/image";

export default function NegotiationListContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <header className="bg-[#216b96] w-full px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
          <div className="container-default section-y w-full">
            <div className="flex items-start justify-between gap-4 min-w-0">
              {/* Title / Help */}
              <div className="flex-1 min-w-0">

                <div>
                  <span className="block text-white font-sans font-bold text-xl sm:text-2xl md:text-3xl leading-tight">
                    Negotiation List
                  </span>
                </div>

                {/* Homepage Link */}
                <div className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 md:pl-6 lg:pl-10">
                  <button
                    onClick={() => router.push("/negotiation/homepage")}
                    className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors px-3 py-2 rounded-md hover:bg-white hover:bg-opacity-10"
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                      />
                    </svg>
                    <span className="font-sans font-medium text-sm sm:text-base">
                      Homepage
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-4 min-w-0 flex-shrink-0">
                {/* User Avatar Dropdown */}
                <div className="relative flex-shrink-0">
                  {whoamiQuery.isLoading ? (
                    <div className="flex items-center space-x-2 text-white">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : whoamiQuery.data?.email ? (
                    <div className="relative">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors focus:outline-none"
                      >
                        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white flex-shrink-0">
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                            />
                          </svg>
                        </div>
                        <svg 
                          className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} flex-shrink-0`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M19 9l-7 7-7-7" 
                          />
                        </svg>
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                          <div className="p-4 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-[#216b96] rounded-full flex items-center justify-center text-white">
                                <svg 
                                  className="w-5 h-5" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{whoamiQuery.data.email}</p>
                                <p className="text-xs text-gray-500 capitalize">requestor</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-2">
                            <button
                              onClick={handleLogout}
                              disabled={isLoggingOut}
                              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoggingOut ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                  <span>Logging out...</span>
                                </>
                              ) : (
                                <>
                                  <svg 
                                    className="w-4 h-4" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      strokeWidth={2} 
                                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                                    />
                                  </svg>
                                  <span>Log out</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-white opacity-75">
                      Not authenticated
                    </div>
                  )}
                </div>

                {/* Logo */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-60 lg:h-60 flex-shrink-0">
                  <a
                    href="https://genomecanada.ca/project/climate-smart-data-collaboration-centre-cs-dcc/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Image
                      src="/CS-DCC_Logo-EN_Colour.png"
                      alt="Logo"
                      width={240}
                      height={240}
                      className="rounded-full bg-blue-200 object-contain"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Dropdown backdrop */}
          {isDropdownOpen && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsDropdownOpen(false)}
            />
          )}
        </header>

        <div className="w-full overflow-x-hidden">
          <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
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
            <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
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