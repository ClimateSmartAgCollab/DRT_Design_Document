// app/negotiation/owner/[link_id]/owner-review/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Providers } from "@/app/providers";
import { parseJsonToFormStructure } from "../../../../components/parser";
import { sortStepsByReferences } from "../../../../components/Form/hooks/useDynamicForm";
import { Field } from "../../../../components/type";

type NegotiationData = {
  questionnaire: any; // The questionnaire JSON data
  owner_responses: string | null;
  comments: string | null;
  requestor_responses: { [key: string]: any };
  state: string;
  rationale?: string;
};

async function fetchNegotiation(link_id: string): Promise<NegotiationData> {
  const res = await fetchApi(`/drt/owner_review/${link_id}/`);
  const data = await res.json();
  
  if (!res.ok) throw new Error(data.error || "Failed to load negotiation");
  return data;
}

export default function OwnerReviewPage() {
  const { link_id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const linkIdStr = Array.isArray(link_id) ? link_id[0] : link_id;

  // Track if we are redirecting due to auth error
  const [redirecting, setRedirecting] = useState(false);

  const {
    data: negotiation,
    error: fetchError,
    isLoading: loadingNegotiation,
    isError: errorNegotiation,
  } = useQuery<NegotiationData, Error>({
    queryKey: ["ownerReview", linkIdStr],
    queryFn: () => fetchNegotiation(linkIdStr!),
    retry: 1,
  });

  useEffect(() => {
    if (
      errorNegotiation &&
      fetchError &&
      (fetchError.message.includes("401") ||
        fetchError.message.includes("403") ||
        fetchError.message.toLowerCase().includes("authentication"))
    ) {
      setRedirecting(true);
      router.replace("/negotiation/owner/email-entry");
    }
  }, [errorNegotiation, fetchError, router]);

  const [fieldComments, setFieldComments] = useState<Record<string, string>>(
    {}
  );
  const [globalComments, setGlobalComments] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!negotiation) return;

    // global comments
    setGlobalComments(negotiation.comments || "");

    // per-field comments from JSON
    if (negotiation.owner_responses) {
      try {
        setFieldComments(JSON.parse(negotiation.owner_responses));
      } catch {
        setFieldComments({});
      }
    }


  }, [negotiation]);

  // Parse questionnaire dynamically
  const parsedSteps = useMemo(() => {
    if (!negotiation?.questionnaire) return [];
    try {
      const unsorted = parseJsonToFormStructure(negotiation.questionnaire);
      const sorted = sortStepsByReferences(unsorted);
      return sorted;
    } catch (error) {
      console.error("Error parsing questionnaire JSON:", error);
      return [];
    }
  }, [negotiation?.questionnaire]);

  const mutationFn = async (
    action: string,
    extras: Record<string, string> = {}
  ) => {
    const formData = new FormData();
    formData.append("owner_responses", JSON.stringify(fieldComments));
    formData.append("comments", globalComments);
    formData.append(action, "true");
    Object.entries(extras).forEach(([k, v]) => formData.append(k, v));

    const res = await fetchApi(`/drt/owner_review/${linkIdStr}/`, {
      method: "POST",
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Action failed");
    return result;
  };

  const actionMutation = useMutation<{ message: string }, Error, string>({
    mutationFn,
    retry: 1,
    onError(err) {
      setStatusMessage(null);
      console.error("Action error:", err);
      setStatusMessage(err.message);
    },
    onSuccess(result, action) {
      qc.invalidateQueries({ queryKey: ["ownerReview", linkIdStr] });
      router.push(`/negotiation/owner/${linkIdStr}/result/${action}`);
    },
  });

  const isActing = actionMutation.status === "pending";

  const parentSteps = useMemo(() => {
    const childIds = new Set<string>();
    parsedSteps.forEach((step) =>
      step.pages.forEach((page) =>
        page.sections.forEach((sec) =>
          sec.fields.forEach((f) => f.ref && childIds.add(f.ref))
        )
      )
    );
    return parsedSteps.filter((s) => !childIds.has(s.id));
  }, [parsedSteps]);

  if (
    redirecting ||
    (errorNegotiation &&
      fetchError &&
      (fetchError.message.includes("401") ||
        fetchError.message.includes("403") ||
        fetchError.message.toLowerCase().includes("authentication")))
  ) {
    return null;
  }

  if (loadingNegotiation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading questionnaire…</p>
      </div>
    );
  }

  if (!negotiation) return null;

  return (
    <Providers>
      <div className="flex items-start justify-center min-h-screen bg-gray-50 py-8">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-3xl space-y-6">
          <h2 className="text-2xl font-bold">Owner Review</h2>

          {parentSteps.map((step) => (
            <section key={step.id} className="space-y-4">
              {step.title && (
                <h3 className="text-xl font-semibold">{step.title.eng}</h3>
              )}
              {step.pages.map((page) =>
                page.sections.map((sec) => (
                  <div
                    key={sec.sectionKey}
                    className="pl-4 border-l-2 border-gray-200"
                  >
                    <h4 className="text-lg font-medium mb-2">
                      {sec.sectionLabel.eng}
                    </h4>
                    {sec.fields.map((field: Field) => {
                      
                      const hasChildrenData = negotiation.requestor_responses[field.id]?.childrenData?.[field.ref!]?.length > 0;
                      
                      if (hasChildrenData) {
                        // Use ChildReview component for fields with children's data
                        return (
                          <div key={field.id} className="mb-4">
                            <label className="block font-medium mb-1">
                              {field.labels.eng?.[field.id] || field.id}
                            </label>
                            <div className="ml-4 mt-2 border-l-4 p-2 border-blue-500">
                              <h5 className="text-md font-semibold text-blue-600">
                                Child Entries for "{field.labels.eng?.[field.id] || field.id}"
                              </h5>
                              {negotiation.requestor_responses[field.id]?.childrenData?.[field.ref!]?.map((child: any, index: number) => {
                                const childStep = parsedSteps.find((s) => s.id === child.stepId);
                                return (
                                  <div key={child.id} className="mt-2 p-2 bg-blue-50">
                                    <h6 className="text-sm font-medium text-gray-700 mb-2">
                                      Entry {index + 1}
                                    </h6>
                                    {childStep ? (
                                      childStep.pages.map((cPage) => (
                                        <div key={cPage.pageKey} className="ml-4">
                                          {cPage.sections.map((cSection) => (
                                            <div key={cSection.sectionKey} className="ml-4 mb-4">
                                              <h6 className="text-lg font-medium">
                                                {cSection.sectionLabel.eng}
                                              </h6>
                                              {cSection.fields.map((cField) => {
                                                const childAnswer = child.data[cField.id];
                                                return (
                                                  <div key={cField.id} className="mb-1 ml-4 break-words">
                                                    <strong>
                                                      {cField.labels.eng?.[cField.id] || cField.id}:{" "}
                                                    </strong>
                                                    <span className="text-gray-600">
                                                      {Array.isArray(childAnswer)
                                                        ? childAnswer.join(", ")
                                                        : childAnswer?.toString() || "No response provided"}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ))}
                                        </div>
                                      ))
                                    ) : (
                                      <p className="ml-4 text-gray-600">No child structure found.</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <textarea
                              placeholder="Owner comment…"
                              value={fieldComments[field.id] || ""}
                              onChange={(e) =>
                                setFieldComments((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.value,
                                }))
                              }
                              className="w-full border rounded p-2 mt-2"
                            />
                          </div>
                        );
                      }

                      // For regular fields, flatten nested responses
                      const flat = Object.entries(
                        negotiation.requestor_responses
                      ).reduce((acc, [k, v]) => {
                        if (v && typeof v === "object" && !Array.isArray(v)) {
                          return { ...acc, ...v };
                        }
                        acc[k] = v;
                        return acc;
                      }, {} as Record<string, any>);
                      const answer = flat[field.id];

                      return (
                        <div key={field.id} className="mb-4">
                          <label className="block font-medium mb-1">
                            {field.labels.eng?.[field.id] || field.id}
                          </label>
                          <div className="p-2 bg-gray-100 rounded mb-2 break-words">
                            {Array.isArray(answer)
                              ? answer.join(", ")
                              : String(answer ?? "—")}
                          </div>
                          <textarea
                            placeholder="Owner comment…"
                            value={fieldComments[field.id] || ""}
                            onChange={(e) =>
                              setFieldComments((prev) => ({
                                ...prev,
                                [field.id]: e.target.value,
                              }))
                            }
                            className="w-full border rounded p-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </section>
          ))}

          {/* Global Comments */}
          <div>
            <label className="block font-medium mb-1">Comments</label>
            <textarea
              value={globalComments}
              onChange={(e) => setGlobalComments(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {["save", "request_clarification", "accept"].map((action) => (
              <button
                key={action}
                onClick={() => actionMutation.mutate(action)}
                disabled={isActing}
                className={`px-4 py-2 rounded text-white font-medium transition ${
                  isActing
                    ? "bg-gray-400 cursor-not-allowed"
                    : action === "accept"
                    ? "bg-green-600 hover:bg-green-700"
                    : action === "request_clarification"
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isActing ? "Processing…" : action.replace("_", " ")}
              </button>
            ))}
            {/* Reject button triggers rationale UI */}
            <button
              onClick={() => actionMutation.mutate("reject")}
              disabled={isActing}
              className={`px-4 py-2 rounded text-white font-medium transition ${
                isActing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isActing ? "Processing…" : "reject"}
            </button>
          </div>
          {statusMessage && (
            <p className="mt-4 text-green-600">{statusMessage}</p>
          )}
        </div>
      </div>
    </Providers>
  );
}
