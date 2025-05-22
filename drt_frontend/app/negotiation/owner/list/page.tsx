// src/app/negotiations/page.tsx
"use client";
import React, { useState, useMemo, useCallback } from "react";
import { useNegotiations } from "./hooks/useNegotiations";
import { Negotiation, Status, ArchivedFilter, SortOption } from "./types";
import { Sidebar } from "./components/Sidebar";
import { BulkActionBar } from "./components/BulkActionBar";
import { NegotiationItem } from "./components/NegotiationItem";
import {
  deleteOldNegotiations,
  deleteNegotiation,
} from "./services/negotiationApi";

export default function NegotiationListPage() {
  const { data: negs, error, reload } = useNegotiations();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status[]>([]);
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("created_desc");

  const handleToggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleReload = useCallback(() => {
    reload();
  }, [reload]);

  const toggleStatus = (status: Status) =>
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );

  const onDateChange = (field: "start" | "end", value: string) => {
    if (field === "start") setStartDate(value);
    else setEndDate(value);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter([]);
    setArchivedFilter("all");
    setStartDate("");
    setEndDate("");
    setSortOption("created_desc");
  };

  const filtered = useMemo(() => {
    return negs.filter((n) => {
      const created = new Date(n.timestamps);
      const txt = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !txt ||
        n.negotiation_id.toLowerCase().includes(txt) ||
        n.conversation_id.toLowerCase().includes(txt);
      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(n.state as Status);
      const matchesArchived =
        archivedFilter === "all" ||
        (archivedFilter === "archived" && n.archived) ||
        (archivedFilter === "active" && !n.archived);
      const afterStart = !startDate || created >= new Date(startDate);
      const beforeEnd = !endDate || created <= new Date(endDate);
      return (
        matchesSearch &&
        matchesStatus &&
        matchesArchived &&
        afterStart &&
        beforeEnd
      );
    });
  }, [negs, searchTerm, statusFilter, archivedFilter, startDate, endDate]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      switch (sortOption) {
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
  }, [filtered, sortOption]);

  const hasOld = negs.some(
    (n) =>
      Date.now() - new Date(n.timestamps).getTime() > 30 * 24 * 60 * 60 * 1000
  );

  const deleteSelected = async () => {
    if (!selected.size) return;
    await Promise.all(Array.from(selected).map((id) => deleteNegotiation(id)));
    setSelected(new Set());
    reload();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onToggleStatus={toggleStatus}
        archivedFilter={archivedFilter}
        onArchivedChange={setArchivedFilter}
        startDate={startDate}
        endDate={endDate}
        onDateChange={onDateChange}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onReset={resetFilters}
      />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-extrabold mb-6 text-gray-800">
          Negotiations ({sorted.length})
        </h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {hasOld && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-gray-700">
              There are negotiations older than 30 days.
              <button
                onClick={async () => {
                  await deleteOldNegotiations();
                  reload();
                }}
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
              onReload={handleReload}
            />
          ))}
        </ul>
      </main>
    </div>
  );
}
