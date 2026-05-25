// app/negotiation/[link_id]/fill-questionnaire/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";
import Form from "../../../../components/Form/Form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Providers } from "@/app/providers";
import Header from "@/app/components/Header";

export interface FillQuestionnaireResponse {
  questionnaire: any; // The questionnaire JSON data
  saved_responses: Record<string, any>;
  owner_responses?: string;
  comments?: string;
}

async function fetchFillQuestionnaire(
  linkId: string
): Promise<FillQuestionnaireResponse> {
  const res = await fetchApi(`/drt/fill_questionnaire/${linkId}/`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load questionnaire");
  return data;
}

export interface SubmitQuestionnairePayload {
  answers: Record<string, any>;
  isSubmit: boolean;
}

async function submitQuestionnaire(
  linkId: string,
  { answers, isSubmit }: SubmitQuestionnairePayload
): Promise<void> {
  const res = await fetchApi(`/drt/fill_questionnaire/${linkId}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...answers, submit: isSubmit, save: !isSubmit }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? "Submission failed");
}

export default function FillQuestionnairePage() {
  const { link_id: linkId } = useParams<{ link_id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    data,
    isLoading: isLoadingData,
    isError: loadError,
    error: loadErrorObj,
  } = useQuery<FillQuestionnaireResponse, Error>({
    queryKey: ["fillQuestionnaire", linkId],
    queryFn: () => fetchFillQuestionnaire(linkId!),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // avoid automatic retries
    enabled: !!linkId, // only run when linkId exists
  });

  const { mutateAsync } = useMutation<void, Error, SubmitQuestionnairePayload>({
    mutationFn: async (payload: SubmitQuestionnairePayload) =>
      submitQuestionnaire(linkId!, payload),
    onSuccess: (_data, variables) => {
      if (!variables.isSubmit) {
        setStatusMessage("Questionnaire saved successfully.");
        // Don't refetch data after save to avoid resetting form state
        // The form data is already up-to-date locally
      } else {
        router.push(`/negotiation/${linkId}/fill-questionnaire/success`);
      }
    },
    onError: (error) => {
      setError(
        error.message || "An error occurred while submitting the questionnaire."
      );
    },
  });

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

  useEffect(() => {
    if (isQuestionnaireLoading) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["fillQuestionnaire", linkId] });
      }, 2000); // Check every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [isQuestionnaireLoading, queryClient, linkId]);

  useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  useEffect(() => {
    if (
      loadError &&
      loadErrorObj &&
      (loadErrorObj.message.includes("401") ||
        loadErrorObj.message.includes("403") ||
        loadErrorObj.message.toLowerCase().includes("authentication"))
    ) {
      setRedirecting(true);
      router.replace(`/negotiation/${linkId}/email-entry`);
    }
  }, [loadError, loadErrorObj, router, linkId]);

  if (
    redirecting ||
    (loadError &&
      loadErrorObj &&
      (loadErrorObj.message.includes("401") ||
        loadErrorObj.message.includes("403") ||
        loadErrorObj.message.toLowerCase().includes("authentication")))
  ) {
    return null;
  }

  if (whoamiQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading requestor...</p>
      </div>
    );
  }

  if (isLoadingData || isQuestionnaireLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>{isQuestionnaireLoading ? "Loading questionnaire data..." : "Loading questionnaire…"}</p>
      </div>
    );
  }

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <Header
          title="Questionnaire"
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

        {statusMessage && (
          <div className="fixed top-4 inset-x-0 flex justify-center pointer-events-none z-50">
            <div className="bg-green-500 text-white px-6 py-2 rounded shadow-lg">
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
              storageKey={linkId ? `drt:questionnaire:${linkId}` : undefined}
              headerRightContent={
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new Event("drt:form:flush"));
                    }
                    router.push(`/negotiation/history/${linkId}?from=questionnaire`);
                  }}
                  className="ml-3 px-4 py-2 bg-[rgb(70,160,35)] text-white rounded hover:bg-[rgb(55,125,28)] disabled:opacity-50"
                  disabled={!linkId}
                >
                  View History
                </button>
              }
              onSave={async (newAnswers) => {
                // console.log('Final payload to backend:', JSON.stringify({ ...newAnswers, submit: false, save: true }, null, 2));
                setError(null);
                setStatusMessage(null);
                await mutateAsync({ answers: newAnswers, isSubmit: false });
              }}
              onSubmit={async (newAnswers) => {
                // console.log('Final payload to backend:', JSON.stringify({ ...newAnswers, submit: true, save: false }, null, 2));
                setError(null);
                setStatusMessage(null);
                await mutateAsync({ answers: newAnswers, isSubmit: true });
              }}
            />
          </div>
        </div>
      </main>
    </Providers>
  );
}
