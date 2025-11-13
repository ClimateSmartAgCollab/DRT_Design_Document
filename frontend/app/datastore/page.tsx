// drt_frontend\app\datastore\page.tsx
"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

type CachedDataResponse = {
  key: string;
  data: any;
};

async function fetchCachedData(key: string): Promise<CachedDataResponse> {
  const res = await fetchApi(`/datastore/get_cached_data/${key}/`);
  if (!res.ok) {
    let errMsg = res.statusText;
    try {
      const errBody = await res.json();
      errMsg = errBody.error ?? errMsg;
    } catch {
      console.error("Failed to parse error response:", res.statusText);
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export default function FetchCachedDataPage() {
  const queryClient = useQueryClient();

  const { data, error, isLoading, isError, isFetching } = useQuery<
    CachedDataResponse,
    Error
  >({
    queryKey: ["cachedData"], // This can be dynamic based on user input
    queryFn: () => fetchCachedData("owner_table"), // Default key for initial load
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Retry once on failure
  });

  const { mutate: reload } = useMutation<CachedDataResponse, Error, string>({
    mutationFn: fetchCachedData,
    onSuccess: (newData) => {
      // Replace cache with fresh data
      queryClient.setQueryData(["cachedData"], newData);
    },
    onError: (err) => {
      console.error("Reload failed:", err);
    },
    retry: 1,
  });

  if (isLoading) {
    return <div className="text-center text-gray-500 mt-10">Initializing…</div>;
  }
  if (isError) {
    return (
      <div className="text-center text-red-500 mt-10">
        Error: {error?.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Fetch Cached Data
        </h1>
        <div className="flex items-center space-x-3">
          <label className="block text-gray-700 mb-2">Cached Key:</label>
          <input
            type="text"
            value={data?.key || ""}
            readOnly
            className="border border-gray-300 p-3 rounded-lg flex-grow focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Cached Data:</label>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-64 text-gray-800 mb-6">
            {JSON.stringify(data?.data, null, 2)}
          </pre>
        </div>
        {isFetching && (
          <p className="text-sm text-gray-500 mb-4">Fetching latest status…</p>
        )}
        <button
          onClick={() => reload("owner_table")}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          disabled={isFetching}
        >
          {isFetching ? "Loading…" : "Reload Data"}
        </button>
      </div>
    </div>
  );
}
