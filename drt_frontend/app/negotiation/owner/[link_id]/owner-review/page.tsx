// drt_frontend/app/negotiation/owner/[link_id]/owner-review/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  HistoryNavigation,
  EmailVerificationModal,
  ActionButtons,
  PermissionInfo,
  QuestionnaireReview,
  LoadingStates,
} from "./components";

import { NegotiationData, NegotiationHistory } from "./types";

import {
  fetchNegotiation,
  fetchNegotiationHistory,
  performAction,
  sendVerificationEmail,
  checkUserAuth,
} from "./api/negotiationApi";

import { useNegotiationHistory } from "./hooks/useNegotiationHistory";
import {
  parseQuestionnaire,
  getParentSteps,
  parseOwnerResponses,
} from "./utils/formUtils";

export default function OwnerReviewPage() {
  const { link_id } = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const linkIdStr = Array.isArray(link_id) ? link_id[0] : link_id;

  const [redirecting, setRedirecting] = useState(false);

  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [isViewingHistory, setIsViewingHistory] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [emailVerificationError, setEmailVerificationError] = useState<
    string | null
  >(null);
  const [emailSent, setEmailSent] = useState(false);

  const [fieldComments, setFieldComments] = useState<Record<string, string>>(
    {}
  );
  const [globalComments, setGlobalComments] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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

  const { data: history, isLoading: loadingHistory } = useQuery<
    NegotiationHistory,
    Error
  >({
    queryKey: ["negotiationHistory", linkIdStr],
    queryFn: () => fetchNegotiationHistory(linkIdStr!),
    retry: 1,
    enabled: !!linkIdStr,
  });

  const { historyEntries } = useNegotiationHistory(history);

  const currentData = useMemo(() => {
    if (!negotiation) {
      console.log("⚠️ No negotiation data available");
      return null;
    }

    const totalEntries = historyEntries.length;

    if (currentHistoryIndex === totalEntries) {
      return {
        ...negotiation,
        owner_responses: null,
        comments: "",
      };
    }

    const historyIndex = currentHistoryIndex;
    const historyEntry = historyEntries[historyIndex];

    if (!historyEntry) {
      console.log("⚠️ Falling back to negotiation data");
      return negotiation;
    }

    return historyEntry.data;
  }, [negotiation, historyEntries, currentHistoryIndex]);

  const parsedSteps = useMemo(() => {
    return parseQuestionnaire(currentData?.questionnaire);
  }, [currentData?.questionnaire]);

  const parentSteps = useMemo(() => {
    return getParentSteps(parsedSteps);
  }, [parsedSteps]);

  const isQuestionnaireLoading = currentData?.questionnaire?._loading;

  // Initialize to latest version when history data is available (only once)
  useEffect(() => {
    if (historyEntries.length > 0) {
      const totalEntries = historyEntries.length;
      setCurrentHistoryIndex(totalEntries - 1);
      setIsViewingHistory(false);
    }
  }, [historyEntries.length]);

  const handleHistoryNavigate = (index: number) => {
    const totalEntries = historyEntries.length;

    if (index < 0) index = 0;
    if (index >= totalEntries) index = totalEntries - 1;

    setCurrentHistoryIndex(index);

    setIsViewingHistory(index < totalEntries - 1);
  };

  useEffect(() => {
    if (!currentData) return;

    setGlobalComments(currentData.comments || "");
    setFieldComments(parseOwnerResponses(currentData.owner_responses));
  }, [currentData]);

  useEffect(() => {
    if (isQuestionnaireLoading) {
      const interval = setInterval(() => {
        qc.invalidateQueries({ queryKey: ["ownerReview", linkIdStr] });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isQuestionnaireLoading, qc, linkIdStr]);

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

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await checkUserAuth();
      setIsAuthenticated(authStatus);
    };
    checkAuth();
  }, []);

  const emailVerificationMutation = useMutation<void, Error, string>({
    mutationFn: sendVerificationEmail,
    onSuccess: () => {
      setEmailVerificationError(null);
      setShowEmailModal(false);
      setEmailSent(true);
      sessionStorage.setItem("pendingOwnerAction", pendingAction || "");
    },
    onError: (error) => {
      setEmailVerificationError(error.message);
    },
  });

  const actionMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: (action: string) =>
      performAction(linkIdStr!, action, fieldComments, globalComments),
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

  const handleActionClick = async (action: string) => {
    const restrictedActions = ["accept", "reject", "request_clarification"];

    if (restrictedActions.includes(action)) {
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
  }, [actionMutation]);

  if (
    redirecting ||
    (errorNegotiation &&
      fetchError &&
      (fetchError?.message?.includes("401") ||
        fetchError?.message?.includes("403") ||
        fetchError?.message?.toLowerCase().includes("authentication")))
  ) {
    return null;
  }

  if (loadingNegotiation || loadingHistory) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading negotiation data...</p>
        </div>
      </div>
    );
  }

  if (loadingNegotiation || loadingHistory || isQuestionnaireLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>
          {isQuestionnaireLoading
            ? "Loading questionnaire data..."
            : "Loading negotiation data…"}
        </p>
      </div>
    );
  }

  if (!negotiation || !currentData) {
    console.log("⚠️ Missing required data:", {
      negotiation: !!negotiation,
      currentData: !!currentData,
    });
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">No negotiation data available</p>
          <p className="text-sm text-gray-500 mt-2">
            Please check the link or try again later.
          </p>
        </div>
      </div>
    );
  }

  if (isActing || isVerifyingEmail || emailSent) {
    return (
      <LoadingStates
        isActing={isActing}
        isVerifyingEmail={isVerifyingEmail}
        emailSent={emailSent}
      />
    );
  }

  const totalEntries = historyEntries.length;

  return (
    <>
      <div className="flex items-start justify-center min-h-screen bg-gray-50 py-8">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Owner Review</h2>
            {isViewingHistory && (
              <button
                onClick={() => handleHistoryNavigate(totalEntries - 1)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Back to Latest
              </button>
            )}
          </div>

          {totalEntries > 1 && (
            <HistoryNavigation
              currentIndex={currentHistoryIndex}
              totalEntries={totalEntries}
              onNavigate={handleHistoryNavigate}
              isHistorical={isViewingHistory}
            />
          )}

          <PermissionInfo isAuthenticated={isAuthenticated} />

          {currentData?.requestor_responses &&
          Object.keys(currentData.requestor_responses).length > 0 ? (
            <>
              <QuestionnaireReview
                parentSteps={parentSteps}
                currentData={currentData}
                fieldComments={fieldComments}
                setFieldComments={setFieldComments}
                isViewingHistory={isViewingHistory}
              />

              <div>
                <label className="block font-medium mb-1">Comments</label>
                <textarea
                  value={globalComments}
                  onChange={(e) => setGlobalComments(e.target.value)}
                  disabled={isViewingHistory}
                  className={`w-full border rounded p-2 ${
                    isViewingHistory ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No questionnaire data available to review.</p>
              <p className="text-sm mt-2">
                This negotiation may not have any responses yet.
              </p>
            </div>
          )}

          <ActionButtons
            onActionClick={handleActionClick}
            isViewingHistory={isViewingHistory}
            isAuthenticated={isAuthenticated}
          />

          {statusMessage && (
            <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-200">
              <p className="text-blue-800">{statusMessage}</p>
            </div>
          )}
        </div>
      </div>

      <EmailVerificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onVerify={handleEmailVerification}
        isLoading={isVerifyingEmail}
        error={emailVerificationError}
      />
    </>
  );
}
