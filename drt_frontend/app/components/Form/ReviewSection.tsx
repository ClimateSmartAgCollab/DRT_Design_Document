"use client";
import React, { useMemo } from "react";
import { ParsedStep } from "./types";
import ChildReview from "./ChildReview";
import { useTheme } from "./hooks/useTheme";
import { SubheadingFormatter } from "./domain/subheading";
import { StepTreeBuilder } from "./domain/step-tree";

interface ReviewSectionProps {
  parsedSteps: ParsedStep[];
  reviewOutput: { title?: string; questions: any[] };
  formData: Record<string, Record<string, any>>;
  parentFormData: Record<string, any>;
  language: string;
  setReviewOutput: (v: { title?: string; questions: any[] } | null) => void;
  onSubmit: (answers: Record<string, Record<string, any>>) => void;
  onSave: (answers: Record<string, Record<string, any>>) => void;
  ownerComments?: Record<string, string>;
  globalOwnerComments?: string;
}

export default function ReviewSection({
  parsedSteps,
  reviewOutput,
  formData,
  parentFormData,
  language,
  setReviewOutput,
  onSubmit,
  onSave,
  ownerComments,
  globalOwnerComments,
}: ReviewSectionProps) {
  const theme = useTheme();

  const parentStepsForReview = useMemo(
    () => new StepTreeBuilder(parsedSteps).getParentSteps(),
    [parsedSteps]
  );

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    fontFamily: theme.fonts.body,
    fontWeight: "600",
    fontSize: "0.875rem",
    color: theme.colors.white,
    backgroundColor: theme.colors.primary,
    transition: "all 0.2s ease-in-out",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  };

  return (
    <section
      className="flex flex-col min-h-screen"
      style={{ fontFamily: theme.fonts.body }}
    >
      <header
        className="border-b pb-4"
        style={{ borderBottomColor: theme.colors.grey[300] }}
      >
        <h1
          className="mb-2 text-center text-3xl font-bold"
          style={{
            color: theme.colors.primary,
            fontFamily: theme.fonts.heading,
          }}
        >
          {reviewOutput.title || "Review Your Responses"}
        </h1>
        <p
          className="text-center text-lg"
          style={{ color: theme.colors.grey[600] }}
        >
          Please review your responses below.
        </p>
      </header>

      <main className="p-4 flex-1 overflow-auto">
        <div className="space-y-6">
          {parentStepsForReview.map((step) => (
            <div key={step.id} className="mb-6">
              <h2
                className="text-2xl font-bold"
                style={{
                  color: theme.colors.primary,
                  fontFamily: theme.fonts.heading,
                }}
              >
                {step.names[language] || step.names.eng}
              </h2>

              {step.pages.map((page) => (
                <div
                  key={page.pageKey}
                  className="mb-4 border-l-2 pl-4"
                  style={{ borderLeftColor: theme.colors.grey[300] }}
                >
                  <h3
                    className="text-xl font-semibold"
                    style={{
                      color: theme.colors.text,
                      fontFamily: theme.fonts.heading,
                    }}
                  >
                    {page.pageLabel[language] || page.pageLabel.eng}
                  </h3>

                  {page.sections.map((section) => (
                    <div
                      key={section.sectionKey}
                      className="mb-4 border-l-2 pl-4"
                      style={{ borderLeftColor: theme.colors.grey[200] }}
                    >
                      <h4
                        className="text-lg font-medium"
                        style={{
                          color: theme.colors.text,
                          fontFamily: theme.fonts.heading,
                        }}
                      >
                        {section.sectionLabel[language] ||
                          section.sectionLabel.eng}
                      </h4>

                      {section.subheading?.[language] && (
                        <div
                          className="text-sm mb-2 italic pl-4"
                          style={{ color: theme.colors.grey[600] }}
                          dangerouslySetInnerHTML={{
                            __html: SubheadingFormatter.format(
                              section.subheading[language]
                            ),
                          }}
                        />
                      )}

                      {section.fields.map((field) => {
                        const hasChildren =
                          field.type === "reference" &&
                          field.ref &&
                          parentFormData[field.id]?.childrenData?.[field.ref]
                            ?.length > 0;

                        if (hasChildren) {
                          return (
                            <div key={field.id} className="mb-2">
                              <label
                                className="block text-sm font-semibold"
                                style={{ color: theme.colors.text }}
                              >
                                {field.labels[language]?.[field.id] ||
                                  field.labels.eng?.[field.id] ||
                                  "No label"}
                                {field.validation?.conformance === "M" && (
                                  <span
                                    style={{ 
                                      color: theme.colors.secondary || "#ff0000", 
                                      marginLeft: "4px" 
                                    }}
                                  >
                                    *
                                  </span>
                                )}
                              </label>
                              <ChildReview
                                field={field}
                                parsedSteps={parsedSteps}
                                language={language}
                              />
                            </div>
                          );
                        }

                        const fieldAnswer =
                          formData[step.id]?.[field.id] ?? field.value;
                        return (
                          <div key={field.id} className="mb-4">
                            <label
                              className="block text-sm font-semibold"
                              style={{ color: theme.colors.text }}
                            >
                              {field.labels[language]?.[field.id] ||
                                field.labels.eng?.[field.id]}
                              {field.validation?.conformance === "M" && (
                                <span
                                  style={{ 
                                    color: theme.colors.secondary || "#ff0000", 
                                    marginLeft: "4px" 
                                  }}
                                >
                                  *
                                </span>
                              )}
                            </label>
                            <div
                              className="mt-1 break-words"
                              style={{ color: theme.colors.grey[600] }}
                            >
                              {Array.isArray(fieldAnswer)
                                ? fieldAnswer.join(", ")
                                : fieldAnswer?.toString() ||
                                  "No response provided"}
                            </div>
                            {ownerComments?.[field.id] && (
                              <div
                                className="mt-2 p-2 text-sm rounded"
                                style={{
                                  backgroundColor: theme.colors.pink[200],
                                  color: theme.colors.text,
                                }}
                              >
                                <strong>Owner Comment:</strong>{" "}
                                {ownerComments[field.id]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {globalOwnerComments && (
          <div
            className="mt-6 p-4 rounded"
            style={{
              backgroundColor: theme.colors.pink[200],
              color: theme.colors.text,
            }}
          >
            <strong>Owner Comments:</strong>
            <p className="mt-1">{(() => {
              const comments = globalOwnerComments || '';
              const fieldCommentsIndex = comments.search(/\n*Field Comments:/);
              if (fieldCommentsIndex !== -1) {
                return comments.substring(0, fieldCommentsIndex).trim();
              }
              return comments.trim();
            })()}</p>
          </div>
        )}
      </main>

      <footer
        className="flex justify-center space-x-4 py-4 border-t"
        style={{ borderTopColor: theme.colors.grey[300] }}
      >
        <button
          type="button"
          onClick={() => setReviewOutput(null)}
          style={buttonStyle}
        >
          Back to Form
        </button>
        <button
          type="button"
          onClick={() => {
            const combined = { ...formData };
            Object.keys(parentFormData).forEach((parentId) => {
              if (parentFormData[parentId]?.childrenData) {
                combined[parentId] = {
                  ...combined[parentId],
                  childrenData: parentFormData[parentId].childrenData,
                };
              }
            });
            onSubmit(combined);
          }}
          style={buttonStyle}
        >
          Submit
        </button>
        <button
          type="button"
          onClick={() => {
            const combined = { ...formData };
            Object.keys(parentFormData).forEach((parentId) => {
              if (parentFormData[parentId]?.childrenData) {
                combined[parentId] = {
                  ...combined[parentId],
                  childrenData: parentFormData[parentId].childrenData,
                };
              }
            });
            onSave(combined);
          }}
          style={buttonStyle}
        >
          Save
        </button>
      </footer>
    </section>
  );
}
