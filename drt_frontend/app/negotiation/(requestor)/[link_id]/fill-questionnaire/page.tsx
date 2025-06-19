// app/negotiation/[link_id]/fill-questionnaire/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";
import Form from "../../../../components/Form/Form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface FillQuestionnaireResponse {
  saved_responses: Record<string, any>;
  owner_responses?: string;
  comments?: string;
}

export async function fetchFillQuestionnaire(
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

export async function submitQuestionnaire(
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
        // Optionally refetch the data to sync with server
        queryClient.invalidateQueries({
          queryKey: ["fillQuestionnaire", linkId],
        });
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

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading questionnaire…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600">
          Error: {loadErrorObj?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <>
      {statusMessage && (
        <div className="fixed top-4 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className="bg-green-500 text-white px-6 py-2 rounded shadow-lg">
            {statusMessage}
          </div>
        </div>
      )}
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-3xl p-4">
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Form
            initialAnswers={initialAnswers}
            ownerComments={ownerComments}
            globalOwnerComments={globalOwnerComments}
            onSave={async (newAnswers) => {
              setError(null);
              setStatusMessage(null);
              await mutateAsync({ answers: newAnswers, isSubmit: false });
            }}
            onSubmit={async (newAnswers) => {
              setError(null);
              setStatusMessage(null);
              await mutateAsync({ answers: newAnswers, isSubmit: true });
            }}
          />
        </div>
      </div>
    </>
  );
}
