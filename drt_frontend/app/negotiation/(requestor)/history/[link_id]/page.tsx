"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";
import NegotiationLayout from "@/app/components/NegotiationLayout";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { parseJsonToFormStructure } from "@/app/components/parser";

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

async function fetchNegotiationHistory(
  linkId: string
): Promise<NegotiationHistory> {
  const negotiationsRes = await fetchApi("/drt/req_negotiations/");
  if (!negotiationsRes.ok) throw new Error("Failed to load negotiations");
  const negotiations = await negotiationsRes.json();

  const negotiation = negotiations.find(
    (n: any) => n.requestor_link === linkId
  );
  if (!negotiation) {
    throw new Error("Negotiation not found");
  }

  const historyRes = await fetchApi(
    `/drt/negotiations/${negotiation.negotiation_id}/history/`
  );
  if (!historyRes.ok) throw new Error("Failed to load negotiation history");
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

function ResponseDisplay({
  responses,
  questionnaire,
  title,
}: {
  responses: Record<string, any>;
  questionnaire?: any;
  title: string;
}) {
  const fieldMeta = React.useMemo(() => {
    if (!questionnaire) return {};
    try {
      const steps = parseJsonToFormStructure(questionnaire);
      const fieldMeta: Record<
        string,
        { label: string; options?: Record<string, string> }
      > = {};
      steps.forEach((step: any) => {
        step.pages.forEach((page: any) => {
          page.sections.forEach((section: any) => {
            section.fields.forEach((field: any) => {
              fieldMeta[field.id] = {
                label: field.labels?.eng?.[field.id] || field.id,
                options: field.options?.eng?.[field.id] || undefined,
              };
            });
          });
        });
      });
      return fieldMeta;
    } catch (error) {
      console.error("Error parsing questionnaire:", error);
      return {};
    }
  }, [questionnaire]);

  const flatData = Object.entries(responses).reduce((acc, [k, v]) => {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      !(v as any).childrenData
    ) {
      return { ...acc, ...v };
    }
    (acc as any)[k] = v;
    return acc;
  }, {} as Record<string, any>);

  const orderedFields: Array<{ fieldId: string; value: any; meta: any }> = [];
  const addedFieldIds = new Set<string>();

  if (questionnaire) {
    try {
      const steps = parseJsonToFormStructure(questionnaire);
      steps.forEach((step: any) => {
        step.pages.forEach((page: any) => {
          page.sections.forEach((section: any) => {
            section.fields.forEach((field: any) => {
              const fieldId = field.id;
              const value = (flatData as any)[fieldId];
              if (
                value !== undefined &&
                fieldId !== "save" &&
                fieldId !== "submit" &&
                !addedFieldIds.has(fieldId)
              ) {
                const meta = (fieldMeta as any)[fieldId] || { label: fieldId };
                orderedFields.push({ fieldId, value, meta });
                addedFieldIds.add(fieldId);
              }
            });
          });
        });
      });
    } catch (error) {
      console.error("Error parsing form structure:", error);
    }
  }

  if (orderedFields.length === 0) {
    return (
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700 mb-2">{title}</h4>
        <div className="bg-gray-50 p-4 rounded border">
          <pre className="whitespace-pre-wrap text-sm text-gray-800">
            {JSON.stringify(responses, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-gray-700 mb-2">{title}</h4>
      <div className="space-y-3">
        {orderedFields.map(({ fieldId, value, meta }) => {
          const hasChildrenData =
            value && typeof value === "object" && (value as any).childrenData;
          if (hasChildrenData) {
            return (
              <div key={fieldId} className="space-y-2">
                <div className="font-medium text-gray-700">{meta.label}</div>
                <div className="ml-4 border-l-4 border-blue-500 pl-4">
                  <div className="text-md font-semibold text-blue-600 mb-2">
                    Child Entries for "{meta.label}"
                  </div>
                  {Object.entries(
                    (value as any).childrenData as Record<string, any>
                  ).map(([childStepId, children]) => {
                    if (Array.isArray(children)) {
                      return children.map((child: any, index: number) => (
                        <div
                          key={`${fieldId}-${childStepId}-${index}`}
                          className="mb-4 p-2 bg-blue-50 rounded"
                        >
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Entry {index + 1}
                          </div>
                          {child.data && typeof child.data === "object" ? (
                            <div className="space-y-1 ml-4">
                              {Object.entries(
                                child.data as Record<string, any>
                              ).map(([childFieldId, childValue]) => {
                                const childMeta = (fieldMeta as any)[
                                  childFieldId
                                ] || { label: childFieldId };
                                let displayChildValue = childValue;
                                if (Array.isArray(childValue)) {
                                  displayChildValue = childValue
                                    .map((v) =>
                                      childMeta.options &&
                                      childMeta.options[v as string]
                                        ? childMeta.options[v as string]
                                        : v
                                    )
                                    .join(", ");
                                } else if (
                                  childMeta.options &&
                                  childMeta.options[childValue as string]
                                ) {
                                  displayChildValue =
                                    childMeta.options[childValue as string];
                                }
                                return (
                                  <div key={childFieldId} className="text-sm">
                                    <strong>{childMeta.label}: </strong>
                                    <span className="text-gray-600">
                                      {displayChildValue || (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="ml-4 text-gray-400">No data</div>
                          )}
                        </div>
                      ));
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          }

          let displayValue = value as any;
          if (Array.isArray(value)) {
            displayValue = (value as any[])
              .map((v) =>
                meta.options && meta.options[v] ? meta.options[v] : v
              )
              .join(", ");
          } else if (meta.options && meta.options[value]) {
            displayValue = meta.options[value];
          } else if (value && typeof value === "object") {
            displayValue = JSON.stringify(value);
          }

          return (
            <div key={fieldId} className="space-y-1">
              <div className="font-medium text-gray-700">{meta.label}</div>
              <div className="text-gray-600 break-words">
                {displayValue ? (
                  String(displayValue)
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArchiveEntryView({
  entry,
  questionnaire,
  isActive,
}: {
  entry: ArchiveEntry;
  questionnaire?: any;
  isActive: boolean;
}) {
  if (!isActive) return null;

  // Normalize owner_responses to an object if it arrives as a JSON string
  let ownerObj: Record<string, any> | null = null;
  if (entry.owner_responses) {
    if (typeof (entry.owner_responses as any) === "string") {
      try {
        ownerObj = JSON.parse(entry.owner_responses as unknown as string);
      } catch {
        ownerObj = { _raw: entry.owner_responses } as any;
      }
    } else {
      ownerObj = entry.owner_responses;
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-sm font-medium text-gray-700">
            Entry {entry.entry_number}
          </div>
          <span className="text-sm text-gray-500">
            {new Date(entry.timestamp).toLocaleString()}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {entry.changed_by ? `by ${entry.changed_by}` : ""}
        </div>
      </div>

      {entry.change_description && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">
            Change Description
          </h4>
          <div className="bg-gray-50 p-3 rounded border">
            <p className="text-sm text-gray-800">{entry.change_description}</p>
          </div>
        </div>
      )}

      {entry.requestor_responses && (
        <ResponseDisplay
          responses={entry.requestor_responses}
          questionnaire={questionnaire}
          title="Requestor Responses"
        />
      )}

      {ownerObj && Object.keys(ownerObj).length > 0 && (
        <ResponseDisplay
          responses={ownerObj}
          questionnaire={questionnaire}
          title="Owner Field Comments"
        />
      )}

      {entry.comments && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">Overall Comments</h4>
          <div className="bg-gray-50 p-4 rounded border">
            <p className="whitespace-pre-wrap text-sm text-gray-800">
              {entry.comments}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentCycleView({
  cycle,
  isActive,
}: {
  cycle: CommentCycle;
  isActive: boolean;
}) {
  if (!isActive) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              cycle.type === "requestor"
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {cycle.type === "requestor" ? "Requestor" : "Owner"}
          </div>
          <span className="text-sm text-gray-500">
            {new Date(cycle.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      {cycle.type === "requestor" && cycle.content && (
        <ResponseDisplay
          responses={JSON.parse(cycle.content)}
          questionnaire={cycle.questionnaire}
          title="Requestor Responses"
        />
      )}

      {cycle.type === "owner" && cycle.globalComments && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">Owner Comments</h4>
          <div className="bg-gray-50 p-4 rounded border">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">
              {cycle.globalComments}
            </pre>
          </div>
        </div>
      )}

      {cycle.type === "owner" &&
        cycle.fieldComments &&
        Object.keys(cycle.fieldComments).length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">
              Field-Specific Comments
            </h4>
            <div className="space-y-2">
              {Object.entries(cycle.fieldComments).map(([fieldId, comment]) => (
                <div key={fieldId} className="bg-gray-50 p-3 rounded border">
                  <div className="font-medium text-sm text-gray-700 mb-1">
                    {fieldId}:
                  </div>
                  <div className="text-sm text-gray-800">{comment}</div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

function CommentNavigation({
  currentIndex,
  totalCycles,
  onNavigate,
}: {
  currentIndex: number;
  totalCycles: number;
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        <div className="justify-self-start">
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={currentIndex <= 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-200"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Previous</span>
          </button>
        </div>

        <div className="justify-self-center min-w-0">
          <div className="text-sm font-medium text-gray-700 text-center whitespace-nowrap">
            Entry {currentIndex + 1} of {totalCycles}
          </div>
        </div>

        <div className="justify-self-end">
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex >= totalCycles - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-200"
          >
            <span>Next</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NegotiationHistoryPage() {
  const { link_id } = useParams();
  const router = useRouter();
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);

  const linkIdStr = Array.isArray(link_id) ? link_id[0] : link_id;

  const {
    data: history,
    error,
    isLoading,
  } = useQuery<NegotiationHistory, Error>({
    queryKey: ["negotiationHistory", linkIdStr],
    queryFn: () => fetchNegotiationHistory(linkIdStr!),
    retry: 1,
    enabled: !!linkIdStr,
  });

  const whoamiQuery = useQuery({
    queryKey: ["requestor", "whoami"],
    queryFn: async () => {
      const res = await fetchApi("/drt/requestor/whoami/");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (whoamiQuery.isError) {
      router.replace("/negotiation/requestor/email-entry");
    }
  }, [whoamiQuery.isError, router]);

  const handleNavigate = (index: number) => {
    setCurrentCycleIndex(index);
  };

  if (isLoading) {
    return (
      <NegotiationLayout
        userType="requestor"
        userEmail={whoamiQuery.data?.email}
        isLoading={whoamiQuery.isLoading}
        pageTitle="Negotiation History"
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            Loading negotiation history...
          </span>
        </div>
      </NegotiationLayout>
    );
  }

  if (error) {
    return (
      <NegotiationLayout
        userType="requestor"
        userEmail={whoamiQuery.data?.email}
        isLoading={whoamiQuery.isLoading}
        pageTitle="Negotiation History"
      >
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-red-600">
              Error loading negotiation history: {error.message}
            </p>
            <button
              onClick={() => router.back()}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </NegotiationLayout>
    );
  }

  if (!history) {
    return (
      <NegotiationLayout
        userType="requestor"
        userEmail={whoamiQuery.data?.email}
        isLoading={whoamiQuery.isLoading}
        pageTitle="Negotiation History"
      >
        <div className="max-w-4xl mx-auto p-6">
          <p className="text-gray-500">
            No history found for this negotiation.
          </p>
        </div>
      </NegotiationLayout>
    );
  }

  const entries: ArchiveEntry[] = (history.archive_history || []).map(
    (e, i) => ({
      ...e,
      entry_number: e.entry_number ?? i + 1,
    })
  );
  const hasArchive = entries.length > 0;
  const hasLegacyCycles =
    history.commentCycles && history.commentCycles.length > 0;
  const totalEntries = hasArchive
    ? entries.length
    : hasLegacyCycles
    ? history.commentCycles.length
    : 0;

  return (
    <NegotiationLayout
      userType="requestor"
      userEmail={whoamiQuery.data?.email}
      isLoading={whoamiQuery.isLoading}
      pageTitle="Negotiation History"
    >
      <div className="max-w-6xl mx-auto p-6">
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
                onClick={() => router.push("/negotiation/requestor/list")}
                className="px-4 py-2 bg-blue-100 text-gray-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>

        {hasArchive ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Archive History
              </h2>
            </div>

            <CommentNavigation
              currentIndex={currentCycleIndex}
              totalCycles={entries.length}
              onNavigate={handleNavigate}
            />

            <ArchiveEntryView
              entry={entries[currentCycleIndex]}
              questionnaire={history.questionnaire}
              isActive={true}
            />
          </>
        ) : hasLegacyCycles ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Submission History (Legacy)
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Navigate through different versions of responses and comments
                over time.
              </p>
            </div>

            <CommentNavigation
              currentIndex={currentCycleIndex}
              totalCycles={history.commentCycles.length}
              onNavigate={handleNavigate}
            />

            <CommentCycleView
              cycle={history.commentCycles[currentCycleIndex]}
              isActive={true}
            />
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-500 text-center">
              No submission history found for this negotiation.
            </p>
          </div>
        )}

        {history.state === "rejected" && history.rationale && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="font-semibold text-gray-700 mb-3">
              Rejection Rationale
            </h3>
            <div className="bg-red-50 p-4 rounded border border-red-200">
              <pre className="whitespace-pre-wrap text-sm text-red-800">
                {history.rationale}
              </pre>
            </div>
          </div>
        )}
      </div>
    </NegotiationLayout>
  );
}
