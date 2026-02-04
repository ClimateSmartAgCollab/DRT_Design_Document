// app/preview-questionnaire/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";
import Form from "../components/Form/Form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Providers } from "@/app/providers";
import Header from "@/app/components/Header";

export interface PreviewQuestionnaireResponse {
  questionnaire: any; // The questionnaire JSON data
  saved_responses: Record<string, any>;
  owner_responses?: string;
  comments?: string;
  is_preview?: boolean;
}

async function fetchPreviewQuestionnaire(): Promise<PreviewQuestionnaireResponse> {
  try {
    const res = await fetchApi(`/drt/preview-questionnaire/`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? `Failed to load questionnaire (${res.status})`);
    }
    return data;
  } catch (error: any) {
    if (error.message?.includes('404')) {
      throw new Error('Preview endpoint not found. Please ensure the backend is running and the endpoint is available.');
    }
    throw error;
  }
}

export default function PreviewQuestionnairePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    isLoading: isLoadingData,
    isError: loadError,
    error: loadErrorObj,
  } = useQuery<PreviewQuestionnaireResponse, Error>({
    queryKey: ["previewQuestionnaire"],
    queryFn: fetchPreviewQuestionnaire,
    staleTime: 5 * 60 * 1000, 
    retry: false,
  });

  const { mutateAsync } = useMutation<void, Error, Record<string, any>>({
    mutationFn: async (_answers: Record<string, any>) => {
      // In preview mode, we don't actually submit - just show a message
      return Promise.resolve();
    },
    onSuccess: () => {
      setStatusMessage("This is a preview. Submissions are disabled.");
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (error) => {
      setError(error.message || "An error occurred.");
    },
  });

  const initialAnswers = useMemo(
    () => data?.saved_responses ?? {},
    [data?.saved_responses]
  );
  const ownerComments = useMemo(() => {
    try {
      return data?.owner_responses ? JSON.parse(data.owner_responses) : {};
    } catch {
      return {};
    }
  }, [data?.owner_responses]);
  const globalOwnerComments = data?.comments ?? "";

  const isQuestionnaireLoading = data?.questionnaire?._loading;

  // Poll for questionnaire data when it's loading (but stop after 30 seconds to prevent infinite polling)
  useEffect(() => {
    if (isQuestionnaireLoading && !loadError) {
      let pollCount = 0;
      const maxPolls = 15; // 15 polls * 2 seconds = 30 seconds max
      
      const interval = setInterval(() => {
        pollCount++;
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ["previewQuestionnaire"] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["previewQuestionnaire"] });
        }
      }, 2000); 
      
      return () => clearInterval(interval);
    }
  }, [isQuestionnaireLoading, loadError, queryClient]);

  if (isLoadingData || isQuestionnaireLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>{isQuestionnaireLoading ? "Loading questionnaire data..." : "Loading questionnaire…"}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-2 font-semibold">Failed to load preview questionnaire.</p>
          <p className="text-gray-600 text-sm mb-4">
            {loadErrorObj?.message || "The preview endpoint may not be available. Please check if the backend is running."}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[rgb(70,160,35)] text-white rounded hover:bg-[rgb(55,125,28)]"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <Header
          title="Questionnaire Preview"
          homepageLink={{
            href: "/",
            onClick: () => router.push("/"),
          }}
        />

        {/* Preview Banner */}
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2">
          <div className="max-w-3xl mx-auto text-sm text-yellow-800">
            <strong>Preview Mode:</strong> This is a demonstration of the questionnaire interface. 
            You can explore the form, but submissions are disabled.
          </div>
        </div>

        {statusMessage && (
          <div className="fixed top-4 inset-x-0 flex justify-center pointer-events-none z-50">
            <div className="bg-[rgb(70,160,35)] text-white px-6 py-2 rounded shadow-lg">
              {statusMessage}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center min-h-screen bg-gray-50 overflow-x-hidden">
          <div className="w-full max-w-3xl p-4">
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <Form
              questionnaireJson={data?.questionnaire}
              initialAnswers={initialAnswers}
              ownerComments={ownerComments}
              globalOwnerComments={globalOwnerComments}
              storageKey="drt:questionnaire:preview"
              onSave={async (newAnswers) => {
                setError(null);
                setStatusMessage(null);
                await mutateAsync(newAnswers);
              }}
              onSubmit={async (newAnswers) => {
                setError(null);
                setStatusMessage(null);
                await mutateAsync(newAnswers);
              }}
            />
          </div>
        </div>
      </main>
    </Providers>
  );
}

