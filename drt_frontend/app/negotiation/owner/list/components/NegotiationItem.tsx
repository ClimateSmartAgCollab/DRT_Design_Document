// drt_frontend\app\negotiation\owner\list\components\NegotiationItem.tsx
import React, { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Negotiation } from "../types";
import {
  archiveNegotiation,
  deleteNegotiation,
} from "../services/negotiationApi";
import Link from "next/link";
import { parseJsonToFormStructure } from "@/app/components/parser";

interface NegotiationItemProps {
  negotiation: Negotiation;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onReload: () => void;
}

function getFieldMeta(questionnaireJson?: any) {
  if (!questionnaireJson) {
    console.warn('No questionnaire JSON provided to getFieldMeta');
    return {};
  }
  
  const steps = parseJsonToFormStructure(questionnaireJson);
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
}

function ResponseTable({ data, questionnaireJson }: { data: Record<string, any>; questionnaireJson?: any }) {
  const fieldMeta = React.useMemo(() => getFieldMeta(questionnaireJson), [questionnaireJson]);
  
  // Get the parsed form structure to maintain order
  const steps = React.useMemo(() => {
    if (!questionnaireJson) {
      console.warn('No questionnaire JSON provided to ResponseTable');
      return [];
    }
    try {
      return parseJsonToFormStructure(questionnaireJson);
    } catch (error) {
      console.error("Error parsing form structure:", error);
      return [];
    }
  }, [questionnaireJson]);
  
  // Flatten nested responses
  const flatData = Object.entries(data).reduce((acc, [k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v) && !v.childrenData) {
      return { ...acc, ...v };
    }
    acc[k] = v;
    return acc;
  }, {} as Record<string, any>);
  
  
  const orderedFields: Array<{ fieldId: string; value: any; meta: any }> = [];
  const addedFieldIds = new Set<string>();
  
  
  steps.forEach((step: any) => {
    step.pages.forEach((page: any) => {
      page.sections.forEach((section: any) => {
        section.fields.forEach((field: any) => {
          const fieldId = field.id;
          const value = flatData[fieldId];
          
          // Only add fields that have data and haven't been added yet
          if (value !== undefined && fieldId !== "save" && fieldId !== "submit" && !addedFieldIds.has(fieldId)) {
            const meta = fieldMeta[fieldId] || { label: fieldId };
            orderedFields.push({ fieldId, value, meta });
            addedFieldIds.add(fieldId);
          }
        });
      });
    });
  });
  
  return (
    <div className="space-y-4">
      {orderedFields.map(({ fieldId, value, meta }) => {
        // Check if this field has children's data
        const hasChildrenData = value && typeof value === 'object' && value.childrenData;
        
        if (hasChildrenData) {
          // Display children's data
          return (
            <div key={fieldId} className="space-y-2">
              <div className="font-medium text-gray-700">
                {meta.label}
              </div>
              <div className="ml-4 border-l-4 border-blue-500 pl-4">
                <div className="text-md font-semibold text-blue-600 mb-2">
                  Child Entries for "{meta.label}"
                </div>
                {Object.entries(value.childrenData as Record<string, any>).map(([childStepId, children]) => {
                  if (Array.isArray(children)) {
                    return children.map((child: any, index: number) => (
                      <div key={`${fieldId}-${childStepId}-${index}`} className="mb-4 p-2 bg-blue-50 rounded">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Entry {index + 1}
                        </div>
                        {child.data && typeof child.data === 'object' ? (
                          <div className="space-y-1 ml-4">
                            {Object.entries(child.data as Record<string, any>).map(([childFieldId, childValue]) => {
                              const childMeta = fieldMeta[childFieldId] || { label: childFieldId };
                              let displayChildValue = childValue;
                              if (Array.isArray(childValue)) {
                                displayChildValue = childValue
                                  .map((v) =>
                                    childMeta.options && childMeta.options[v as string] ? childMeta.options[v as string] : v
                                  )
                                  .join(", ");
                              } else if (childMeta.options && childMeta.options[childValue as string]) {
                                displayChildValue = childMeta.options[childValue as string];
                              }
                              return (
                                <div key={childFieldId} className="text-sm">
                                  <strong>{childMeta.label}: </strong>
                                  <span className="text-gray-600">
                                    {displayChildValue || <span className="text-gray-400">—</span>}
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
        
        // Regular field display
        let displayValue = value;
        if (Array.isArray(value)) {
          displayValue = value
            .map((v) =>
              meta.options && meta.options[v] ? meta.options[v] : v
            )
            .join(", ");
        } else if (meta.options && meta.options[value]) {
          displayValue = meta.options[value];
        } else if (value && typeof value === 'object') {
          // Handle objects by converting to string
          displayValue = JSON.stringify(value);
        }
        
        return (
          <div key={fieldId} className="space-y-1">
            <div className="font-medium text-gray-700">
              {meta.label}
            </div>
            <div className="text-gray-600 break-words">
              {displayValue ? String(displayValue) : <span className="text-gray-400">—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NegotiationItem({
  negotiation: n,
  isSelected,
  onToggleSelect,
  onReload,
}: NegotiationItemProps) {

  const [expanded, setExpanded] = React.useState(false);
  const canArchive =
    !n.archived && ["completed", "canceled", "rejected"].includes(n.state);



  const handleArchive = async () => {
    await archiveNegotiation(n.negotiation_id);
    onReload();
  };

  const handleDelete = async () => {
    await deleteNegotiation(n.negotiation_id);
    onReload();
  };

  return (
    <li className={`bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden${expanded ? ' ring-2 ring-blue-200' : ''}`}>
      <div className="flex items-center px-6 py-4 hover:bg-gray-100 transition">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(n.negotiation_id)}
          className="mr-4 h-4 w-4 text-blue-600"
          onClick={e => e.stopPropagation()}
        />
        <div
          className="flex-1 flex flex-wrap gap-x-4 gap-y-1 items-center"
        >
          <span className="font-semibold text-gray-800">
            ID: {n.negotiation_id}
          </span>
          <span className="text-gray-600">State: {n.state}</span>
          <span className="text-gray-600">
            Created: {new Date(n.timestamps).toLocaleDateString()}
          </span>
          <span className="text-gray-600">
            Archived: {n.archived ? "Yes" : "No"}
          </span>
          {n.tags && n.tags.length > 0 && (
            <span className="flex items-center gap-1">
              {Array.isArray(n.tags)
                ? n.tags.map((tag, idx) => (
                    <span
                      key={tag + idx}
                      className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200"
                    >
                      {tag}
                    </span>
                  ))
                : (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                      {n.tags}
                    </span>
                  )}
            </span>
          )}
          {n.record_label && (
            <span className="ml-2 inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded border border-green-200">
              Record Label: {n.record_label}
            </span>
          )}
          {n.state === "owner_open" && n.owner_link && (
            <Link
              href={`/negotiation/owner/${n.owner_link}/owner-review`}
              className="ml-4 text-blue-600 underline hover:text-blue-800"
            >
              Access Your Review Link
            </Link>
          )}
        </div>
        <button
          type="button"
          aria-label={expanded ? "Collapse details" : "Expand details"}
          aria-expanded={expanded}
          aria-controls={`negotiation-details-${n.negotiation_id}`}
          onClick={e => { e.stopPropagation(); setExpanded(e => !e); }}
          title={expanded ? "Collapse details" : "Expand details"}
          className={`ml-4 text-xl text-gray-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded transition-transform duration-200 ${expanded ? 'rotate-90' : 'rotate-0'}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
            className="inline-block align-middle"
          >
            <path
              d="M6 8l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`negotiation-details-${n.negotiation_id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Requestor Responses
                  </h4>
                                     {(() => {
                     const { save, submit, ...reqData } = n.requestor_responses || {};
                     return <ResponseTable data={reqData} questionnaireJson={n.questionnaire} />;
                   })()}
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Owner Responses
                  </h4>
                                     {(() => {
                     let ownerData = {};
                     try {
                       ownerData =
                         n.owner_responses &&
                         typeof n.owner_responses === "string"
                           ? JSON.parse(n.owner_responses)
                           : n.owner_responses || {};
                     } catch {
                       ownerData = {};
                     }
                     return <ResponseTable data={ownerData} questionnaireJson={n.questionnaire} />;
                   })()}
                </div>
                {/* Show rationale if rejected */}
                {n.state === "rejected" &&
                  n.rationale &&
                  n.rationale.trim() && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-gray-700 mb-2">
                        Rationale for Rejection
                      </h5>
                      <div className="text-gray-800 whitespace-pre-line border border-gray-200">
                        {n.rationale}
                      </div>
                    </div>
                  )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canArchive && (
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Archive
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export default React.memo(NegotiationItem);
