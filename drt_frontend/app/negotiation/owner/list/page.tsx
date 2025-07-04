// drt_frontend\app\negotiation\owner\list\page.tsx
"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useNegotiations } from "./hooks/useNegotiations";
import { useFilterState } from "./hooks/useFilterState";
import { Status, ArchivedFilter, SortOption } from "./types";
import { Sidebar } from "./components/Sidebar";
import { BulkActionBar } from "./components/BulkActionBar";
import { NegotiationItem } from "./components/NegotiationItem";
import {
  deleteOldNegotiations,
  deleteNegotiation,
} from "./services/negotiationApi";
import fetchApi from "@/app/api/apiHelper";

export default function NegotiationListPage() {
  const router = useRouter();
  const { link_id } = useParams();
  const qc = useQueryClient();
  const { data: negs, error, isLoading, reload } = useNegotiations();
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
  const deleteOld = useMutation({
    mutationFn: deleteOldNegotiations,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["negotiations"] }),
  });

  const handleToggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const deleteSelected = async () => {
    if (!selected.size) return;
    await Promise.all(
      Array.from(selected).map((id) => deleteOne.mutateAsync(id))
    );
    setSelected(new Set());
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
      const matchesTag = selectedTag.length === 0 || (Array.isArray(n.tags) ? n.tags.some(t => t && selectedTag.includes(t)) : (n.tags && selectedTag.includes(n.tags)));
      const matchesRecordLabel = selectedRecordLabel.length === 0 || (n.record_label && selectedRecordLabel.includes(n.record_label));
      return (
        matchesSearch &&
        matchesStatus &&
        matchesArchived &&
        afterStart &&
        beforeEnd &&
        matchesTag &&
        matchesRecordLabel
      );
    });
  }, [negs, filters.searchTerm, filters.statusFilter, filters.archivedFilter, filters.startDate, filters.endDate, selectedTag, selectedRecordLabel]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (filters.sortOption) {
        case "created_asc":
          return (
            new Date(a.timestamps).getTime() - new Date(b.timestamps).getTime()
          );
        case "created_desc":
          return (
            new Date(b.timestamps).getTime() - new Date(a.timestamps).getTime()
          );
        case "status_asc":
          return a.state.localeCompare(b.state);
        case "status_desc":
          return b.state.localeCompare(a.state);
        case "archived_first":
          return (b.archived ? 1 : 0) - (a.archived ? 1 : 0);
        case "archived_last":
          return (a.archived ? 1 : 0) - (b.archived ? 1 : 0);
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, filters.sortOption]);

  const hasOld = negs.some(
    (n) =>
      Date.now() - new Date(n.timestamps).getTime() > 30 * 24 * 60 * 60 * 1000
  );

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

  return (
    <div className="flex min-h-screen bg-gray-50">
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

      <main className="flex-1 p-8">
        {/* ← Back button */}
        <button
          onClick={() => router.push("/negotiation/owner/homepage")}
          className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Back to homepage
        </button>

        <h1 className="text-3xl font-extrabold mb-6 text-gray-800">
          Negotiations ({sorted.length})
        </h1>

        {isLoading && <p className="text-gray-600">Loading…</p>}
        {error && <p className="text-red-600 mb-4">{error}</p>}

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
          onDeleteSelected={deleteSelected}
        />

        <ul className="space-y-4">
          {sorted.map((n) => (
            <NegotiationItem
              key={n.negotiation_id}
              negotiation={n}
              isSelected={selected.has(n.negotiation_id)}
              onToggleSelect={handleToggleSelect}
              onReload={reload}
            />
          ))}
        </ul>
      </main>
    </div>
  );
}
