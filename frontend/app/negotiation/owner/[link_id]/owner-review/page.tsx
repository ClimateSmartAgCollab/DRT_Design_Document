// drt_frontend/app/negotiation/owner/[link_id]/owner-review/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  HistoryNavigation,
  EmailVerificationModal,
  ActionButtons,
  PermissionInfo,
  QuestionnaireReview,
  LoadingStates,
  OverallCommentVersions,
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

const TERMINAL_ACTIONS = ["accept", "reject", "request_clarification"];

function isAuthError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("authentication") ||
    msg.includes("owner authentication required")
  );
}

function isAcceptedError(error: Error): boolean {
  return error.message.toLowerCase().includes("accepted");
}

function isRequestorOpenError(error: Error): boolean {
  return error.message.toLowerCase().includes("requestor_open");
}

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
    isPending: pendingNegotiation,
    isSuccess: successNegotiation,
    isError: errorNegotiation,
  } = useQuery<NegotiationData, Error>({
    queryKey: ["ownerReview", linkIdStr],
    queryFn: () => fetchNegotiation(linkIdStr!),
    retry: 1,
    // enabled: !!linkIdStr && isAuthenticated === true,
  });

  const { data: history, isPending: pendingHistory } = useQuery<
    NegotiationHistory,
    Error
  >({
    queryKey: ["negotiationHistory", linkIdStr],
    queryFn: () => fetchNegotiationHistory(linkIdStr!),
    retry: 1,
    // enabled: !!linkIdStr && isAuthenticated === true,
  });

  const { historyEntries } = useNegotiationHistory(history);

  const isDataReady = successNegotiation && !pendingHistory && !!negotiation;

  const currentData = useMemo(() => {
    if (!isDataReady || !negotiation) return undefined;

    const totalEntries = historyEntries.length;

    if (currentHistoryIndex === totalEntries) {
      return {
        ...negotiation,
        owner_responses: negotiation.owner_responses,
        comments: negotiation.comments,
      };
    }

    const historyEntry = historyEntries[currentHistoryIndex];
    if (!historyEntry) return negotiation;

    return historyEntry.data;
  }, [isDataReady, negotiation, historyEntries, currentHistoryIndex]);

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

    // For history view, get field comments from the latest owner comment version
    if (isViewingHistory && historyEntries.length > 0 && currentHistoryIndex < historyEntries.length) {
      const currentHistoryEntry = historyEntries[currentHistoryIndex];
      if (currentHistoryEntry?.ownerCommentVersions && currentHistoryEntry.ownerCommentVersions.length > 0) {
        const latestOwnerVersion = currentHistoryEntry.ownerCommentVersions[
          currentHistoryEntry.ownerCommentVersions.length - 1
        ];
        
        // Parse field comments from owner_responses
        const fieldCommentsFromResponses = parseOwnerResponses(
          latestOwnerVersion.owner_responses 
            ? JSON.stringify(latestOwnerVersion.owner_responses)
            : null
        );
        
        const combinedFieldComments = { ...fieldCommentsFromResponses};
        
        setFieldComments(combinedFieldComments);
        
        // For history view, also set global comments from the historical data
        setGlobalComments(latestOwnerVersion.comments || "");
      } else {
        setFieldComments({});
        setGlobalComments("");
      }
    } else {
      // For latest version (reopening), clear both field and global comments for fresh editing
      // Previous comments will still be visible in history
      setFieldComments({});
      setGlobalComments("");
    }
  }, [currentData, isViewingHistory, historyEntries, currentHistoryIndex]);

  // Cap polling at ~30 seconds (15 attempts * 2s) so a stalled Celery fetch
  // does not leave the user staring at a spinner forever.
  const MAX_LOADING_ATTEMPTS = 15;
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const loadingTimedOut = loadingAttempts >= MAX_LOADING_ATTEMPTS;

  useEffect(() => {
    if (!isQuestionnaireLoading) {
      if (loadingAttempts !== 0) setLoadingAttempts(0);
      return;
    }
    if (loadingTimedOut) return;

    const interval = setInterval(() => {
      setLoadingAttempts((prev) => prev + 1);
      qc.invalidateQueries({ queryKey: ["ownerReview", linkIdStr] });
    }, 2000);

    return () => clearInterval(interval);
  }, [isQuestionnaireLoading, loadingTimedOut, loadingAttempts, qc, linkIdStr]);

  useEffect(() => {
    if (errorNegotiation && fetchError && isAuthError(fetchError)) {
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
    onSuccess(_result, action) {
      setStatusMessage(null);
      if (!TERMINAL_ACTIONS.includes(action)) {
        qc.invalidateQueries({ queryKey: ["ownerReview", linkIdStr] });
        qc.invalidateQueries({ queryKey: ["negotiationHistory", linkIdStr] });
      }
      router.push(`/negotiation/owner/${linkIdStr}/result/${action}`);
    },
  });

  const isActing = actionMutation.status === "pending";
  const isVerifyingEmail = emailVerificationMutation.status === "pending";

  const handleActionClick = async (action: string) => {
    if (TERMINAL_ACTIONS.includes(action)) {
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
    const storedAction = sessionStorage.getItem("pendingOwnerAction");
    if (!storedAction) return;

    sessionStorage.removeItem("pendingOwnerAction");
    setStatusMessage(
      "Authentication successful! Executing your pending action..."
    );

    setTimeout(async () => {
      const authStatus = await checkUserAuth();
      setIsAuthenticated(authStatus);
      if (authStatus) {
        actionMutation.mutate(storedAction);
      } else {
        setStatusMessage(
          "Authentication expired. Please try the action again."
        );
      }
    }, 1000);
  }, [actionMutation]);

  if (redirecting || (errorNegotiation && fetchError && isAuthError(fetchError))) {
    return null;
  }

  if (pendingNegotiation || pendingHistory) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(70,160,35)] mx-auto mb-4"></div>
          <p className="text-lg">Loading negotiation data...</p>
        </div>
      </div>
    );
  }

  if (isQuestionnaireLoading && loadingTimedOut) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-600">
          Questionnaire is taking longer than expected to load.
        </p>
        <button
          onClick={() => {
            setLoadingAttempts(0);
            qc.invalidateQueries({ queryKey: ["ownerReview", linkIdStr] });
          }}
          className="bg-[rgb(70,160,35)] text-white px-4 py-2 rounded hover:bg-[rgb(55,125,28)] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (pendingNegotiation || pendingHistory || isQuestionnaireLoading) {
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

  if (errorNegotiation && fetchError) {
    if (isAcceptedError(fetchError)) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-600">
              This negotiation has already been accepted and is no longer
              editable.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <Link
                href={`/negotiation/owner/${linkIdStr}/result/accept`}
                className="text-[rgb(70,160,35)] underline hover:text-[rgb(55,125,28)]"
              >
                View acceptance outcome
              </Link>
              <Link
                href="/negotiation/owner/homepage"
                className="text-[rgb(70,160,35)] underline hover:text-[rgb(55,125,28)]"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    if (isRequestorOpenError(fetchError)) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg text-gray-600">
              The requestor has not submitted their questionnaire yet.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              You will be able to review this request once it has been
              submitted.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Unable to load negotiation</p>
          <p className="text-sm text-gray-500 mt-2">{fetchError.message}</p>
        </div>
      </div>
    );
  }

  if (!negotiation || !currentData) {
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
                className="px-3 py-1 text-sm bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] rounded hover:bg-[rgba(180,230,160,0.5)] transition-colors"
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
                parsedSteps={parsedSteps}
                currentData={currentData}
                fieldComments={fieldComments}
                setFieldComments={setFieldComments}
                isViewingHistory={isViewingHistory}
                ownerCommentVersions={historyEntries[currentHistoryIndex]?.ownerCommentVersions}
              />

              {/* Overall Comments Section */}
              {isViewingHistory && historyEntries[currentHistoryIndex]?.ownerCommentVersions && 
               historyEntries[currentHistoryIndex].ownerCommentVersions.length > 0 ? (
                <OverallCommentVersions
                  ownerCommentVersions={historyEntries[currentHistoryIndex].ownerCommentVersions}
                />
              ) : (
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
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No questionnaire data available to review.</p>
              <p className="text-sm mt-2">
                This negotiation may not have any responses yet.
              </p>
            </div>
          )}

          {/* Overall Comments History */}
          {historyEntries.length > 0 && historyEntries[currentHistoryIndex]?.ownerCommentVersions && 
           historyEntries[currentHistoryIndex].ownerCommentVersions.length > 0 && (
            <OverallCommentVersions
              ownerCommentVersions={historyEntries[currentHistoryIndex].ownerCommentVersions}
            />
          )}

          <ActionButtons
            onActionClick={handleActionClick}
            isViewingHistory={isViewingHistory}
            isAuthenticated={isAuthenticated}
          />

          {statusMessage && (
            <div className="mt-4 p-3 rounded bg-[rgba(180,230,160,0.2)] border border-[rgb(55,125,28)]">
              <p className="text-[rgb(55,125,28)]">{statusMessage}</p>
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
