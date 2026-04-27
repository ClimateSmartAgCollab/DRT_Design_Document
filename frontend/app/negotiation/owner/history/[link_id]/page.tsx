"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { parseJsonToFormStructure } from "@/app/components/parser";
import { Field } from "@/app/components/type";
import { Providers } from "@/app/providers";
import Header from "@/app/components/Header";

interface CommentCycle {
  id: string;
  timestamp: string;
  type: "requestor" | "owner";
  content?: string;
  fieldComments?: Record<string, string>;
  globalComments?: string;
  questionnaire?: any;
}

interface ArchiveEntry {
  entry_number: number;
  timestamp: string;
  changed_by: string;
  change_description: string;
  state: string;
  requestor_responses: Record<string, any> | null;
  owner_responses: Record<string, any> | null;
  comments: string | null;
}

interface NegotiationHistory {
  negotiation_id: string;
  conversation_id: string;
  state: string;
  timestamps: string;
  requestor_responses: Record<string, any> | null;
  owner_responses: Record<string, any> | null;
  comments: string | null;
  rationale?: string;
  questionnaire?: any;
  commentCycles: CommentCycle[];
  version_history?: any[];
  archive_history?: ArchiveEntry[];
  is_legacy: boolean;
}

interface HistoryEntry {
  data: any;
  timestamp: string;
  changeDescription?: string;
  ownerCommentVersions?: OwnerCommentVersion[];
}

interface OwnerCommentVersion {
  timestamp: string;
  owner_responses: Record<string, any> | null;
  comments: string | null;
  state: string;
  change_description: string;
}


type TaggedError = Error & { status?: number; transient?: boolean };

async function readJsonErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error && typeof body.error === "string") return body.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Unknown error";
}

function throwHttpError(
  res: Response,
  message: string,
  transient = false
): never {
  const err = new Error(message) as TaggedError;
  err.status = res.status;
  err.transient = transient;
  throw err;
}

function throwTransient(message: string): never {
  const err = new Error(message) as TaggedError;
  err.transient = true;
  throw err;
}

function isTaggedError(e: unknown): e is TaggedError {
  return e instanceof Error;
}

function isTransientError(e: unknown): boolean {
  if (!isTaggedError(e)) return false;
  if (e.transient) return true;
  // `fetchApi` maps any 5xx response to `Error("Server error: <status>")`
  // without attaching a status field, so fall back to pattern matching.
  if (/^Server error:/i.test(e.message)) return true;
  // Plain `fetch` failures (offline, DNS, CORS, aborted) throw TypeError.
  if (e.name === "TypeError") return true;
  return false;
}

async function fetchNegotiationHistory(
  linkId: string
): Promise<NegotiationHistory> {
  const negotiationsRes = await fetchApi(
    `/drt/negotiations/?owner_link=${encodeURIComponent(linkId)}&lightweight=true`
  );
  if (!negotiationsRes.ok) {
    const detail = await readJsonErrorDetail(negotiationsRes);
    const msg =
      negotiationsRes.status === 401
        ? "Your owner session expired. Please sign in again."
        : `Failed to load negotiations (${negotiationsRes.status}): ${detail}`;
    // 5xx from the listing endpoint is transient (server/cache hiccup).
    throwHttpError(negotiationsRes, msg, negotiationsRes.status >= 500);
  }
  const negotiationsPayload = await negotiationsRes.json();
  const negotiations = Array.isArray(negotiationsPayload?.results)
    ? negotiationsPayload.results
    : negotiationsPayload;

  const negotiation = negotiations && negotiations[0];
  if (!negotiation) {
    // The listing endpoint filters by a Redis-backed `owner_table` lookup.
    // When that cache is cold (TTL expiry, eviction, or right after the
    // GitHub webhook invalidates it) the query returns an empty list even
    // though the negotiation exists. Treat this as transient so react-query
    // retries while the cache warms up instead of surfacing the error.
    throwTransient("Negotiation not found");
  }

  const historyRes = await fetchApi(
    `/drt/negotiations/${negotiation.negotiation_id}/history/`
  );
  if (!historyRes.ok) {
    const detail = await readJsonErrorDetail(historyRes);
    const msg =
      historyRes.status === 401
        ? "Your owner session expired. Please sign in again."
        : `Failed to load negotiation history (${historyRes.status}): ${detail}`;
    throwHttpError(historyRes, msg, historyRes.status >= 500);
  }
  const raw = await historyRes.json();

  let archive_history: ArchiveEntry[] | undefined = raw.archive_history;
  if (!archive_history && Array.isArray(raw.version_history)) {
    archive_history = raw.version_history.map((v: any, idx: number) => ({
      entry_number: idx + 1,
      timestamp: v.timestamp,
      changed_by: v.changed_by,
      change_description: v.change_description,
      state: v.state,
      requestor_responses: v.requestor_responses ?? null,
      owner_responses: v.owner_responses ?? null,
      comments: v.comments ?? null,
    }));
  }

  return {
    ...raw,
    archive_history,
  } as NegotiationHistory;
}

function useNegotiationHistory(history: NegotiationHistory | undefined) {
  const historyEntries = React.useMemo((): HistoryEntry[] => {
    if (!history?.archive_history || history.archive_history.length === 0) {
      return [];
    }

    const entries: HistoryEntry[] = [];

    let currentEntry: any = null;

    history.archive_history.forEach((archiveEntry) => {
      const hasRequestorData =
        archiveEntry.requestor_responses &&
        Object.keys(archiveEntry.requestor_responses).length > 0;
      const hasOwnerData =
        archiveEntry.owner_responses || archiveEntry.comments;

      if (hasRequestorData) {
        // If we have a current entry, save it (even if no owner comment versions yet)
        if (currentEntry) {
          entries.push({
            data: {
              questionnaire: history.questionnaire,
              requestor_responses: currentEntry.requestor_responses || {},
              owner_responses:
                currentEntry.ownerCommentVersions &&
                currentEntry.ownerCommentVersions.length > 0
                  ? currentEntry.ownerCommentVersions[
                      currentEntry.ownerCommentVersions.length - 1
                    ].owner_responses
                    ? JSON.stringify(
                        currentEntry.ownerCommentVersions[
                          currentEntry.ownerCommentVersions.length - 1
                        ].owner_responses
                      )
                    : null
                  : null,
              comments:
                currentEntry.ownerCommentVersions &&
                currentEntry.ownerCommentVersions.length > 0
                  ? currentEntry.ownerCommentVersions[
                      currentEntry.ownerCommentVersions.length - 1
                    ].comments || ""
                  : "",
              state:
                currentEntry.ownerCommentVersions &&
                currentEntry.ownerCommentVersions.length > 0
                  ? currentEntry.ownerCommentVersions[
                      currentEntry.ownerCommentVersions.length - 1
                    ].state
                  : currentEntry.state,
              rationale: history.rationale,
            },
            timestamp: currentEntry.timestamp,
            changeDescription: currentEntry.change_description,
            ownerCommentVersions: currentEntry.ownerCommentVersions || [],
          });
        }

        currentEntry = {
          requestor_responses: archiveEntry.requestor_responses,
          ownerCommentVersions: [],
          state: archiveEntry.state,
          timestamp: archiveEntry.timestamp,
          change_description: archiveEntry.change_description,
        };
      }

      if (hasOwnerData && currentEntry) {
        const ownerVersion: OwnerCommentVersion = {
          timestamp: archiveEntry.timestamp,
          owner_responses: archiveEntry.owner_responses,
          comments: archiveEntry.comments,
          state: archiveEntry.state,
          change_description: archiveEntry.change_description,
        };

        currentEntry.ownerCommentVersions.push(ownerVersion);
      }
    });

    if (currentEntry) {
      entries.push({
        data: {
          questionnaire: history.questionnaire,
          requestor_responses: currentEntry.requestor_responses || {},
          owner_responses:
            currentEntry.ownerCommentVersions &&
            currentEntry.ownerCommentVersions.length > 0
              ? currentEntry.ownerCommentVersions[
                  currentEntry.ownerCommentVersions.length - 1
                ].owner_responses
                ? JSON.stringify(
                    currentEntry.ownerCommentVersions[
                      currentEntry.ownerCommentVersions.length - 1
                    ].owner_responses
                  )
                : null
              : null,
          comments:
            currentEntry.ownerCommentVersions &&
            currentEntry.ownerCommentVersions.length > 0
              ? currentEntry.ownerCommentVersions[
                  currentEntry.ownerCommentVersions.length - 1
                ].comments || ""
              : "",
          state:
            currentEntry.ownerCommentVersions &&
            currentEntry.ownerCommentVersions.length > 0
              ? currentEntry.ownerCommentVersions[
                  currentEntry.ownerCommentVersions.length - 1
                ].state
              : currentEntry.state,
          rationale: history.rationale,
        },
        timestamp: currentEntry.timestamp,
        changeDescription: currentEntry.change_description,
        ownerCommentVersions: currentEntry.ownerCommentVersions || [],
      });
    }

    return entries;
  }, [history]);

  return { historyEntries };
}

function HistoryNavigation({
  currentIndex,
  totalEntries,
  onNavigate,
  isHistorical,
}: {
  currentIndex: number;
  totalEntries: number;
  onNavigate: (index: number) => void;
  isHistorical: boolean;
}) {
  if (totalEntries <= 1) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        <div className="justify-self-start">
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={currentIndex <= 0}
            className="flex items-center space-x-2 px-4 py-2 bg-[rgba(180,230,160,0.2)] text-[rgb(55,125,28)] rounded-lg hover:bg-[rgba(180,230,160,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[rgb(55,125,28)]"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Previous</span>
          </button>
        </div>

        <div className="justify-self-center min-w-0">
          <div className="text-sm font-medium text-gray-700 text-center whitespace-nowrap">
            {isHistorical
              ? `Entry ${currentIndex + 1} of ${totalEntries - 1}`
              : `Latest Version`}
          </div>
          {isHistorical && (
            <div className="text-xs text-gray-500 text-center mt-1">
              Historical View - Read Only
            </div>
          )}
        </div>

        <div className="justify-self-end">
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex >= totalEntries - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-[rgba(180,230,160,0.2)] text-[rgb(55,125,28)] rounded-lg hover:bg-[rgba(180,230,160,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[rgb(55,125,28)]"
          >
            <span>Next</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function OwnerCommentVersions({
  fieldId,
  ownerCommentVersions,
}: {
  fieldId: string;
  ownerCommentVersions: OwnerCommentVersion[];
}) {
  if (!ownerCommentVersions || ownerCommentVersions.length === 0) {
    return null;
  }

  // // Parse field comments from the global comments field
  // const parseFieldCommentsFromGlobal = (comments: string) => {
  //   const fieldCommentsMatch = comments.match(/Field Comments:\n([\s\S]*)/);
  //   if (fieldCommentsMatch) {
  //     const fieldCommentsText = fieldCommentsMatch[1];
  //     const fieldComments: Record<string, string> = {};
  //     const lines = fieldCommentsText.split('\n');
  //     lines.forEach(line => {
  //       const match = line.match(/Field (\w+): (.+)/);
  //       if (match) {
  //         fieldComments[match[1]] = match[2];
  //       }
  //     });
  //     return fieldComments;
  //   }
  //   return {};
  // };

  const relevantVersions = ownerCommentVersions
    .map((version) => {
      // First try to get field comments from owner_responses
      const fieldCommentsFromResponses = parseOwnerResponses(
        typeof version.owner_responses === "string"
          ? version.owner_responses
          : version.owner_responses
          ? JSON.stringify(version.owner_responses)
          : null
      );
      
      // Then try to get field comments from global comments
      // const fieldCommentsFromGlobal = parseFieldCommentsFromGlobal(version.comments || '');
      
      // Combine both sources
      const fieldComments = { ...fieldCommentsFromResponses};
      
      return {
        ...version,
        fieldComment: fieldComments[fieldId],
      };
    })
    .filter((version) => version.fieldComment);

  if (relevantVersions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {relevantVersions.map((version, index) => (
        <div
          key={`${version.timestamp}-${index}`}
          className="bg-gray-50 p-3 rounded border"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-sm text-gray-700">
              Owner Comments (Version {index + 1})
            </div>
            <div className="text-xs text-gray-500">
              {new Date(version.timestamp).toLocaleString()}
              {version.change_description && (
                <span className="ml-2 px-2 py-1 bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] rounded text-xs">
                  {version.change_description}
                </span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-800 mb-1">
            {version.fieldComment}
          </div>
        </div>
      ))}
    </div>
  );
}

function OverallCommentVersions({
  ownerCommentVersions,
}: {
  ownerCommentVersions: OwnerCommentVersion[];
}) {
  if (!ownerCommentVersions || ownerCommentVersions.length === 0) {
    return null;
  }

  const relevantVersions = ownerCommentVersions.filter(
    (version) => version.comments && version.comments.trim()
  );

  if (relevantVersions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <h4 className="font-semibold text-gray-700">Overall Comments History</h4>
      {relevantVersions.map((version, index) => (
        <div
          key={`overall-${version.timestamp}-${index}`}
          className="bg-gray-50 p-4 rounded border"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-sm text-gray-700">
              Overall Comments (Version {index + 1})
            </div>
            <div className="text-xs text-gray-500">
              {new Date(version.timestamp).toLocaleString()}
              {version.change_description && (
                <span className="ml-2 px-2 py-1 bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] rounded text-xs">
                  {version.change_description}
                </span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {(() => {
              const comments = version.comments || '';
              const fieldCommentsIndex = comments.search(/\n*Field Comments:/);
              if (fieldCommentsIndex !== -1) {
                return comments.substring(0, fieldCommentsIndex).trim();
              }
              return comments.trim();
            })()}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionnaireReview({
  parentSteps,
  currentData,
  ownerCommentVersions,
}: {
  parentSteps: any[];
  currentData: any;
  ownerCommentVersions?: OwnerCommentVersion[];
}) {
  if (
    !currentData?.requestor_responses ||
    Object.keys(currentData.requestor_responses).length === 0
  ) {
    return null;
  }

  const fieldComments = parseOwnerResponses(currentData.owner_responses);

  return (
    <>
      {parentSteps.map((step) => (
        <section key={step.id} className="space-y-4">
          {step.title && (
            <h3 className="text-xl font-semibold">{step.title.eng}</h3>
          )}
          {step.pages.map((page: any) =>
            page.sections.map((sec: any) => (
              <div
                key={sec.sectionKey}
                className="pl-4 border-l-2 border-gray-200"
              >
                <h4 className="text-lg font-medium mb-2">
                  {sec.sectionLabel.eng}
                </h4>
                {sec.fields.map((field: Field) => {
                  const hasChildrenData =
                    currentData?.requestor_responses?.[field.id]
                      ?.childrenData?.[field.ref!]?.length > 0;

                  if (hasChildrenData) {
                    return (
                      <div key={field.id} className="mb-4">
                        <label className="block font-medium mb-1">
                          {field.labels.eng?.[field.id] || field.id}
                        </label>
                        <div className="ml-4 mt-2 border-l-4 p-2 border-[rgb(70,160,35)]">
                          <h5 className="text-md font-semibold text-[rgb(70,160,35)]">
                            Child Entries for &quot;
                            {field.labels.eng?.[field.id] || field.id}&quot;
                          </h5>
                          {currentData?.requestor_responses?.[
                            field.id
                          ]?.childrenData?.[field.ref!]?.map(
                            (child: any, index: number) => {
                              const childStep = parentSteps.find(
                                (s) => s.id === child.stepId
                              );
                              return (
                                <div
                                  key={child.id}
                                  className="mt-2 p-2 bg-[rgba(180,230,160,0.2)]"
                                >
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">
                                    Entry {index + 1}
                                  </h6>
                                  {childStep ? (
                                    childStep.pages.map((cPage: any) => (
                                      <div key={cPage.pageKey} className="ml-4">
                                        {cPage.sections.map((cSection: any) => (
                                          <div
                                            key={cSection.sectionKey}
                                            className="ml-4 mb-4"
                                          >
                                            <h6 className="text-lg font-medium">
                                              {cSection.sectionLabel.eng}
                                            </h6>
                                            {cSection.fields.map(
                                              (cField: any) => {
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
                                                        ? childAnswer.join(", ")
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
                        {/* Owner comments for child data */}
                        {ownerCommentVersions &&
                        ownerCommentVersions.length > 0 ? (
                          <OwnerCommentVersions
                            fieldId={field.id}
                            ownerCommentVersions={ownerCommentVersions}
                          />
                        ) : fieldComments[field.id] ? (
                          <div className="mt-2">
                            <div className="bg-gray-50 p-3 rounded border">
                              <div className="font-medium text-sm text-gray-700 mb-1">
                                Owner Comments:
                              </div>
                              <div className="text-sm text-gray-800">
                                {fieldComments[field.id]}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  const flat = Object.entries(
                    currentData?.requestor_responses || {}
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
                      {/* Owner comments for regular fields */}
                      {ownerCommentVersions &&
                      ownerCommentVersions.length > 0 ? (
                        <OwnerCommentVersions
                          fieldId={field.id}
                          ownerCommentVersions={ownerCommentVersions}
                        />
                      ) : fieldComments[field.id] ? (
                        <div className="bg-gray-50 p-3 rounded border">
                          <div className="font-medium text-sm text-gray-700 mb-1">
                            Owner Comments:
                          </div>
                          <div className="text-sm text-gray-800">
                            {fieldComments[field.id]}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </section>
      ))}
    </>
  );
}

function parseQuestionnaire(questionnaire: any) {
  if (!questionnaire) return [];
  try {
    return parseJsonToFormStructure(questionnaire);
  } catch (error) {
    console.error("Error parsing questionnaire:", error);
    return [];
  }
}

function getParentSteps(steps: any[]) {
  return steps.filter((step) => !step.ref);
}

function parseOwnerResponses(
  ownerResponses: string | null
): Record<string, string> {
  if (!ownerResponses) return {};

  try {
    let parsedComments;
    if (typeof ownerResponses === "string") {
      parsedComments = JSON.parse(ownerResponses);

      if (typeof parsedComments === "string") {
        parsedComments = JSON.parse(parsedComments);
      }
    } else {
      parsedComments = ownerResponses;
    }

    if (typeof parsedComments === "object" && !Array.isArray(parsedComments)) {
      return parsedComments;
    } else {
      return {};
    }
  } catch (error) {
    console.error("Error parsing owner responses:", error);
    return {};
  }
}

export default function NegotiationHistoryPage() {
  const { link_id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const linkIdStr = Array.isArray(link_id) ? link_id[0] : link_id;

  const whoamiQuery = useQuery({
    queryKey: ["owner", "whoami"],
    queryFn: async () => {
      const res = await fetchApi("/drt/owner/whoami/");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  const {
    data: history,
    error,
    isLoading: historyIsLoading,
    isFetching: historyIsFetching,
    refetch: refetchHistory,
  } = useQuery<NegotiationHistory, TaggedError>({
    queryKey: ["negotiationHistory", linkIdStr],
    queryFn: () => fetchNegotiationHistory(linkIdStr!),
    enabled: Boolean(linkIdStr) && whoamiQuery.isSuccess,
    retry: (failureCount, err) => {
      // Do not retry auth/permission/not-found errors from the history
      // endpoint – they won't resolve themselves.
      if (
        isTaggedError(err) &&
        typeof err.status === "number" &&
        !err.transient &&
        [401, 403, 404].includes(err.status)
      ) {
        return false;
      }
      // Retry transient errors (cold cache, 5xx, network blip) more
      // aggressively so the user doesn't see spurious failures.
      const max = isTransientError(err) ? 5 : 3;
      return failureCount < max;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const isLoading =
    whoamiQuery.isLoading ||
    (Boolean(linkIdStr) &&
      whoamiQuery.isSuccess &&
      historyIsLoading);

  const { historyEntries } = useNegotiationHistory(history);

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

  const currentData = useMemo(() => {
    if (!historyEntries.length) {
      return {
        questionnaire: history?.questionnaire,
        requestor_responses: history?.requestor_responses || {},
        owner_responses: history?.owner_responses,
        comments: history?.comments || "",
        state: history?.state,
        rationale: history?.rationale,
      };
    }

    const totalEntries = historyEntries.length;

    if (currentHistoryIndex === totalEntries) {
      return {
        questionnaire: history?.questionnaire,
        requestor_responses: history?.requestor_responses || {},
        owner_responses: history?.owner_responses,
        comments: history?.comments || "",
        state: history?.state,
        rationale: history?.rationale,
      };
    }

    const historyEntry = historyEntries[currentHistoryIndex];
    return historyEntry
      ? historyEntry.data
      : {
          questionnaire: history?.questionnaire,
          requestor_responses: history?.requestor_responses || {},
          owner_responses: history?.owner_responses,
          comments: history?.comments || "",
          state: history?.state,
          rationale: history?.rationale,
        };
  }, [history, historyEntries, currentHistoryIndex]);

  const parsedSteps = useMemo(() => {
    return parseQuestionnaire(currentData?.questionnaire);
  }, [currentData?.questionnaire]);

  const parentSteps = useMemo(() => {
    return getParentSteps(parsedSteps);
  }, [parsedSteps]);

  const regenerateLicenseMutation = useMutation({
    mutationFn: async () => {
      if (!history) throw new Error("No history data available");
      const res = await fetchApi(
        `/drt/negotiations/regenerate-license/${history.negotiation_id}/`
      );
      if (!res.ok) throw new Error("Failed to regenerate license");
      return res.blob();
    },
    onSuccess: (blob) => {
      if (!history) return;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `license_negotiation_id:${history.negotiation_id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  useEffect(() => {
    if (error && isTaggedError(error) && error.status === 401) {
      router.replace("/negotiation/owner/email-entry");
    }
  }, [error, router]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchApi('/drt/owner/logout/', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      router.push('/negotiation/owner/email-entry');
    },
    onError: (error) => {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      // Still redirect even if logout fails
      router.push('/negotiation/owner/email-entry');
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    logoutMutation.mutate();
  };

  const handleRegenerateLicense = () => {
    regenerateLicenseMutation.mutate();
  };

  // Common Header component props
  const headerProps = {
    title: "Negotiation History",
    homepageLink: {
      href: "/negotiation/owner/homepage",
      onClick: () => router.push("/negotiation/owner/homepage"),
    },
    userDropdown: {
      email: whoamiQuery.data?.email || "",
      role: "owner" as const,
      isLoading: whoamiQuery.isLoading,
      isLoggingOut: isLoggingOut,
      onLogout: handleLogout,
    },
  };

  const totalEntries = historyEntries.length;

  return (
    <Providers>
      <main className="min-h-dvh bg-white flex flex-col">
        {/* Header Bar */}
        <Header {...headerProps} />

        <div className="flex flex-col items-center w-full px-2 sm:px-4 py-6 sm:py-8 md:py-10">
          <div className="max-w-6xl w-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(70,160,35)]"></div>
                <span className="ml-3 text-gray-600">
                  Loading negotiation history...
                </span>
              </div>
            ) : error ? (
              (() => {
                const transient = isTransientError(error);
                const status = isTaggedError(error) ? error.status : undefined;
                const friendlyMessage = transient
                  ? "We couldn't load the negotiation history just now. This is usually temporary – please try again in a few seconds."
                  : status === 404
                  ? "This negotiation could not be found. It may have been removed."
                  : status === 403
                  ? "You don't have permission to view this negotiation."
                  : `Error loading negotiation history: ${error.message}`;

                return (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                    <p className="text-red-700 font-medium">{friendlyMessage}</p>
                    {transient && (
                      <p className="text-sm text-red-600 mt-1">
                        Details: {error.message}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {transient && (
                        <button
                          onClick={() => refetchHistory()}
                          disabled={historyIsFetching}
                          className="px-4 py-2 bg-[rgb(70,160,35)] text-white rounded hover:bg-[rgb(55,125,28)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {historyIsFetching ? "Retrying..." : "Try Again"}
                        </button>
                      )}
                      <button
                        onClick={() => router.push("/negotiation/owner/list")}
                        className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded hover:bg-red-100 transition-colors"
                      >
                        Back to List
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : !history ? (
              <p className="text-gray-500">
                No history found for this negotiation.
              </p>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        Negotiation History
                      </h1>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>ID:</strong> {history.negotiation_id}
                        </p>
                        <p>
                          <strong>State:</strong> {history.state}
                        </p>
                        <p>
                          <strong>Created:</strong>{" "}
                          {new Date(history.timestamps).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => router.push("/negotiation/owner/list")}
                        className="px-4 py-2 bg-[rgba(180,230,160,0.3)] text-gray-700 rounded-lg hover:bg-[rgba(180,230,160,0.5)] transition-colors"
                      >
                        Back to List
                      </button>

                      {history.state === "accepted" && (
                        <button
                          onClick={handleRegenerateLicense}
                          disabled={regenerateLicenseMutation.isPending}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {regenerateLicenseMutation.isPending
                            ? "Generating..."
                            : "Regenerate License"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {totalEntries > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-800">
                        Archive History
                      </h2>
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

                    {currentData?.requestor_responses &&
                    Object.keys(currentData.requestor_responses).length > 0 ? (
                      <>
                        <QuestionnaireReview
                          parentSteps={parentSteps}
                          currentData={currentData}
                          ownerCommentVersions={
                            historyEntries[currentHistoryIndex]?.ownerCommentVersions
                          }
                        />

                        {historyEntries[currentHistoryIndex]?.ownerCommentVersions &&
                        historyEntries[currentHistoryIndex].ownerCommentVersions
                          .length > 0 ? (
                          <OverallCommentVersions
                            ownerCommentVersions={
                              historyEntries[currentHistoryIndex].ownerCommentVersions
                            }
                          />
                        ) : currentData.comments ? (
                          <div className="mt-6">
                            <label className="block font-medium mb-1">
                              Overall Comments
                            </label>
                            <div className="bg-gray-50 p-4 rounded border">
                              <pre className="whitespace-pre-wrap text-sm text-gray-800">
                                {currentData.comments}
                              </pre>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No questionnaire data available to review.</p>
                        <p className="text-sm mt-2">
                          This negotiation may not have any responses yet.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <p className="text-gray-500 text-center">
                      No submission history found for this negotiation.
                    </p>
                  </div>
                )}

                {currentData?.state === "rejected" && currentData?.rationale && (
                  <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                    <h3 className="font-semibold text-gray-700 mb-3">
                      Rejection Rationale
                    </h3>
                    <div className="bg-red-50 p-4 rounded border border-red-200">
                      <pre className="whitespace-pre-wrap text-sm text-red-800">
                        {currentData.rationale}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </Providers>
  );
}
