// drt_frontend/app/negotiation/owner/[link_id]/owner-review/page.tsx
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

function EmailVerificationModal({
  isOpen,
  onClose,
  onVerify,
  isLoading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (email: string) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Email Verification Required
        </h3>
        <p className="text-gray-600 mb-4">
          To perform this action, please verify your email address. We'll send
          you a verification link. After verification, your action will be
          automatically completed.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
          disabled={isLoading}
        />

        <div className="flex space-x-3">
          <button
            onClick={() => onVerify(email)}
            disabled={!email}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send Verification
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerReviewPage() {
  const { link_id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const linkIdStr = Array.isArray(link_id) ? link_id[0] : link_id;

  // Track if we are redirecting due to auth error
  const [redirecting, setRedirecting] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [emailVerificationError, setEmailVerificationError] = useState<
    string | null
  >(null);
  const [emailSent, setEmailSent] = useState(false);

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

    if (negotiation.questionnaire._loading) {
      return [];
    }

    try {
      const unsorted = parseJsonToFormStructure(negotiation.questionnaire);
      const sorted = sortStepsByReferences(unsorted);
      return sorted;
    } catch (error) {
      console.error("Error parsing questionnaire JSON:", error);
      return [];
    }
  }, [negotiation?.questionnaire]);

  const isQuestionnaireLoading = negotiation?.questionnaire?._loading;

  useEffect(() => {
    if (isQuestionnaireLoading) {
      const interval = setInterval(() => {
        qc.invalidateQueries({ queryKey: ["ownerReview", linkIdStr] });
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [isQuestionnaireLoading, qc, linkIdStr]);

  const mutationFn = async (
    action: string,
    extras: Record<string, string> = {}
  ) => {
    const formData = new FormData();
    formData.append("owner_responses", JSON.stringify(fieldComments));
    formData.append("comments", globalComments);
    formData.append(action, "true");
    Object.entries(extras).forEach(([k, v]) => formData.append(k, v));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

    try {
      const res = await fetchApi(`/drt/owner_review/${linkIdStr}/`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Action failed");
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    }
  };

  const emailVerificationMutation = useMutation<void, Error, string>({
    mutationFn: async (email: string) => {
      // Include the current page URL as target for verification
      const currentUrl = window.location.href;
      console.log("Sending verification email with target URL:", currentUrl);
      const res = await fetchApi("/drt/verify/owner-email/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          target_url: currentUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send verification email");
      }
    },
    onSuccess: () => {
      setEmailVerificationError(null);
      setShowEmailModal(false);
      setEmailSent(true);
      // Store the pending action to execute after verification
      console.log("Storing pending action:", pendingAction);
      sessionStorage.setItem("pendingOwnerAction", pendingAction || "");
    },
    onError: (error) => {
      setEmailVerificationError(error.message);
    },
  });

  const actionMutation = useMutation<{ message: string }, Error, string>({
    mutationFn,
    retry: 1,
    onError(err) {
      setStatusMessage(null);
      console.error("Action error:", err);
      setStatusMessage(err.message);
    },
    onSuccess(result, action) {
      setStatusMessage(null);
      qc.invalidateQueries({ queryKey: ["ownerReview", linkIdStr] });
      router.push(`/negotiation/owner/${linkIdStr}/result/${action}`);
    },
  });

  const isActing = actionMutation.status === "pending";
  const isVerifyingEmail = emailVerificationMutation.status === "pending";

  const checkUserAuth = async (): Promise<boolean> => {
    try {
      const res = await fetchApi("/drt/owner/whoami/");
      return res.ok;
    } catch {
      return false;
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await checkUserAuth();
      setIsAuthenticated(authStatus);
    };
    checkAuth();
  }, []);

  const handleActionClick = async (action: string) => {
    const restrictedActions = ["accept", "reject", "request_clarification"];

    if (restrictedActions.includes(action)) {
      // Use cached authentication status if available, otherwise check
      let authStatus = isAuthenticated;
      if (authStatus === null) {
        authStatus = await checkUserAuth();
        setIsAuthenticated(authStatus);
      }

      if (authStatus) {
        actionMutation.mutate(action);
      } else {
        setPendingAction(action);
        setShowEmailModal(true);
        setEmailVerificationError(null);
      }
    } else {
      // Non-restricted action (save), proceed directly
      actionMutation.mutate(action);
    }
  };

  const handleEmailVerification = (email: string) => {
    emailVerificationMutation.mutate(email);
  };

  useEffect(() => {
    const pendingAction = sessionStorage.getItem("pendingOwnerAction");
    if (pendingAction) {
      console.log("Found pending action:", pendingAction);
      sessionStorage.removeItem("pendingOwnerAction");
      setStatusMessage(
        "Authentication successful! Executing your pending action..."
      );
      // Small delay to ensure the page is fully loaded and user is authenticated
      setTimeout(async () => {
        const authStatus = await checkUserAuth();
        console.log("User authenticated:", authStatus);
        setIsAuthenticated(authStatus);
        if (authStatus) {
          console.log("Executing pending action:", pendingAction);
          actionMutation.mutate(pendingAction);
        } else {
          setStatusMessage(
            "Authentication expired. Please try the action again."
          );
        }
      }, 1000);
    }
  }, []);

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

  if (loadingNegotiation || isQuestionnaireLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>
          {isQuestionnaireLoading
            ? "Loading questionnaire data..."
            : "Loading questionnaire…"}
        </p>
      </div>
    );
  }

  if (!negotiation) return null;

  if (isActing || isVerifyingEmail) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {isVerifyingEmail
              ? "Sending Verification Email"
              : "Processing Your Request"}
          </h2>
          <p className="text-gray-600">
            {isVerifyingEmail
              ? "Please wait while we send the verification email..."
              : "Please wait while we process your action..."}
          </p>
        </div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Verification Email Sent!
            </h2>
            <p className="text-gray-600 mb-6">
              Please check your inbox and click the link to verify your email. After verification, your action will be automatically completed.
            </p>
            <div className="text-sm text-gray-500">
              <p>You can close this page and return to your email.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Providers>
      <div className="flex items-start justify-center min-h-screen bg-gray-50 py-8">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-3xl space-y-6">
          <h2 className="text-2xl font-bold">Owner Review</h2>

          {/* Permission information */}
          <div
            className={`${
              isAuthenticated === false
                && "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start">
              {isAuthenticated === false && (
                <svg
                  className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <div>
                <h3
                  className={`text-sm font-medium ${
                    isAuthenticated === false && "text-blue-800"
                  }`}
                >
                  {isAuthenticated === false && "Permission Information"}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    isAuthenticated === false && "text-blue-700"
                  }`}
                >
                  {isAuthenticated === false &&
                    "Anyone with this link can view and save comments. Actions that change the negotiation status (accept, reject, request clarification) require email verification."}
                </p>
              </div>
            </div>
          </div>

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
                      const hasChildrenData =
                        negotiation.requestor_responses[field.id]
                          ?.childrenData?.[field.ref!]?.length > 0;

                      if (hasChildrenData) {
                        // Use ChildReview component for fields with children's data
                        return (
                          <div key={field.id} className="mb-4">
                            <label className="block font-medium mb-1">
                              {field.labels.eng?.[field.id] || field.id}
                            </label>
                            <div className="ml-4 mt-2 border-l-4 p-2 border-blue-500">
                              <h5 className="text-md font-semibold text-blue-600">
                                Child Entries for "
                                {field.labels.eng?.[field.id] || field.id}"
                              </h5>
                              {negotiation.requestor_responses[
                                field.id
                              ]?.childrenData?.[field.ref!]?.map(
                                (child: any, index: number) => {
                                  const childStep = parsedSteps.find(
                                    (s) => s.id === child.stepId
                                  );
                                  return (
                                    <div
                                      key={child.id}
                                      className="mt-2 p-2 bg-blue-50"
                                    >
                                      <h6 className="text-sm font-medium text-gray-700 mb-2">
                                        Entry {index + 1}
                                      </h6>
                                      {childStep ? (
                                        childStep.pages.map((cPage) => (
                                          <div
                                            key={cPage.pageKey}
                                            className="ml-4"
                                          >
                                            {cPage.sections.map((cSection) => (
                                              <div
                                                key={cSection.sectionKey}
                                                className="ml-4 mb-4"
                                              >
                                                <h6 className="text-lg font-medium">
                                                  {cSection.sectionLabel.eng}
                                                </h6>
                                                {cSection.fields.map(
                                                  (cField) => {
                                                    const childAnswer =
                                                      child.data[cField.id];
                                                    return (
                                                      <div
                                                        key={cField.id}
                                                        className="mb-1 ml-4 break-words"
                                                      >
                                                        <strong>
                                                          {cField.labels.eng?.[
                                                            cField.id
                                                          ] || cField.id}
                                                          :{" "}
                                                        </strong>
                                                        <span className="text-gray-600">
                                                          {Array.isArray(
                                                            childAnswer
                                                          )
                                                            ? childAnswer.join(
                                                                ", "
                                                              )
                                                            : childAnswer?.toString() ||
                                                              "No response provided"}
                                                        </span>
                                                      </div>
                                                    );
                                                  }
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ))
                                      ) : (
                                        <p className="ml-4 text-gray-600">
                                          No child structure found.
                                        </p>
                                      )}
                                    </div>
                                  );
                                }
                              )}
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
            {["save", "request_clarification", "accept"].map((action) => {
              const isRestricted = [
                "accept",
                "reject",
                "request_clarification",
              ].includes(action);
              const showLock = isRestricted && isAuthenticated === false;
              return (
                <button
                  key={action}
                  onClick={() => handleActionClick(action)}
                  className={`px-4 py-2 rounded text-white font-medium transition ${
                    action === "accept"
                      ? "bg-green-600 hover:bg-green-700"
                      : action === "request_clarification"
                      ? "bg-yellow-500 hover:bg-yellow-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                  title={showLock ? "Requires email verification" : undefined}
                >
                  <span className="flex items-center">
                    {action.replace("_", " ")}
                    {showLock && (
                      <svg
                        className="ml-1 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
            {/* Reject button triggers rationale UI */}
            <button
              onClick={() => handleActionClick("reject")}
              className="px-4 py-2 rounded text-white font-medium transition bg-red-600 hover:bg-red-700"
              title={
                isAuthenticated === false
                  ? "Requires email verification"
                  : undefined
              }
            >
              <span className="flex items-center">
                reject
                {isAuthenticated === false && (
                  <svg
                    className="ml-1 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
            </button>
          </div>
          {statusMessage && (
            <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-200">
              <p className="text-blue-800">{statusMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onVerify={handleEmailVerification}
        isLoading={isVerifyingEmail}
        error={emailVerificationError}
      />
    </Providers>
  );
}
