// app/negotiation/[link_id]/fill-questionnaire/page.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";
import Form from "../../../../components/Form/Form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Providers } from "@/app/providers";
import Image from "next/image";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  const { mutateAsync, isPending: isSubmitting } = useMutation<
    void,
    Error,
    SubmitQuestionnairePayload
  >({
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
  }, [loadError, loadErrorObj, router]);

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
        <header className="bg-[#216b96] w-full px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-6 sm:pb-8 md:pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
          <div className="container-default section-y w-full">
            <div className="flex items-start justify-between gap-4 min-w-0">
              {/* Title / Help */}
              <div className="flex-1 min-w-0">
                <div>
                  <span className="block text-white font-sans font-bold text-xl sm:text-2xl md:text-3xl leading-tight">
                    Questionnaire
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
                  className="ml-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
