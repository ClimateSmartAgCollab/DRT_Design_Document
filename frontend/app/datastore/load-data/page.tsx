// drt_frontend/app/datastore/load-data/page.tsx
"use client";

import React from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { Providers } from "@/app/providers";


type LoadResponse = {
  status: string;      
  data?: any;          
};


async function fetchLoadData(): Promise<LoadResponse> {
  const res = await fetchApi("/datastore/load-data/");
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

export default function LoadDataPage() {
  const queryClient = useQueryClient();

  const {
    data,
    error,
    isLoading,
    isError,
    isFetching,
  } = useQuery<LoadResponse, Error>({
    queryKey: ["loadData"],            
    queryFn: fetchLoadData,            
    staleTime: 1000 * 60 * 5,          // 5 minutes
    retry: 1,                          // retry once on failure
  });


  // Mutation to reload data on button click
  const { mutate: reload } = useMutation<LoadResponse, Error, void>({
    mutationFn: fetchLoadData,
    onSuccess: (newData) => {
      // replace cache with fresh data
      queryClient.setQueryData(["loadData"], newData);
    },
    onError: (err) => {
      console.error("Reload failed:", err);
    },
    retry: 1,
  });


  if (isLoading) {
    return (
      <div className="text-center text-gray-500 mt-10">
        Initializing…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="text-center text-red-500 mt-10">
        Error: {error?.message}
      </div>
    );
  }

  return (
    <Providers>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Load GitHub Data
          </h1>

          {/* show background fetch */}
          {isFetching && (
            <p className="text-sm text-gray-500 mb-4">
              Fetching latest status…
            </p>
          )}

          {/* the “reload” button */}
          <button
            onClick={() => reload()}
            disabled={isFetching}
            className={`w-full px-4 py-2 font-semibold rounded-lg transition-colors duration-200 ${
              isFetching ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
            } text-white`}
          >
            {isFetching ? "Loading…" : "Load Data"}
          </button>

          {/* show the server’s status message */}
          {data && (
            <p className="mt-4 text-lg font-medium text-green-500">
              {data.status}
            </p>
          )}
        </div>
      </div>
    </Providers>
  );
}
