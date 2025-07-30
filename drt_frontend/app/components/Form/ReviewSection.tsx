// drt_frontend\app\components\Form\ReviewSection.tsx
"use client";

import React from "react";
import { ParsedStep } from "./types";
import ChildReview from "./ChildReview";
import { useTheme } from "./hooks/useTheme";

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

// Helper function to format subheading text with line breaks and bullet points
const formatSubheading = (text: string): string => {
  if (!text) return '';
  
  // Split by double line breaks to separate paragraphs
  const paragraphs = text.split('\n\n');
  
  // Process each paragraph
  const formattedParagraphs = paragraphs.map(paragraph => {
    // Check if paragraph contains bullet points
    if (paragraph.includes('•')) {
      // Split by single line breaks to separate bullet points
      const lines = paragraph.split('\n');
      const formattedLines = lines.map(line => {
        if (line.trim().startsWith('•')) {
          // Format bullet points
          return `<li>${line.trim().substring(1).trim()}</li>`;
        } else if (line.trim().includes(':')) {
          // Format section headers (like "Role:", "Responsibilities:")
          return `<strong>${line.trim()}</strong>`;
        } else {
          // Regular text
          return line.trim();
        }
      });
      
      // Join bullet points in a list
      const listItems = formattedLines.filter(line => line.startsWith('<li>'));
      const otherLines = formattedLines.filter(line => !line.startsWith('<li>'));
      
      let result = '';
      if (otherLines.length > 0) {
        result += otherLines.join('<br/>');
      }
      if (listItems.length > 0) {
        result += '<ul style="margin: 8px 0; padding-left: 20px;">' + listItems.join('') + '</ul>';
      }
      return result;
    } else {
      // Regular paragraph
      return paragraph.trim().replace(/\n/g, '<br/>');
    }
  });
  
  return formattedParagraphs.join('<br/><br/>');
};

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

  // Identify which steps are children (referenced by other fields)
  const childStepIds = new Set<string>();
  parsedSteps.forEach((step) =>
    step.pages.forEach((page) =>
      page.sections.forEach((section) =>
        section.fields.forEach((field) => {
          if (field.ref) childStepIds.add(field.ref);
        })
      )
    )
  );
  // Only display steps that are *not* children (i.e., parent/root steps)
  const parentStepsForReview = parsedSteps.filter(
    (step) => !childStepIds.has(step.id)
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
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
                      {section.subheading && section.subheading[language] && (
                        <div
                          className="text-sm mb-2 italic pl-4"
                          style={{ color: theme.colors.grey[600] }}
                          dangerouslySetInnerHTML={{
                            __html: formatSubheading(section.subheading[language])
                          }}
                        />
                      )}
                      {section.fields.map((field) => {
                        const hasChildren =
                          field.type === "reference" &&
                          field.ref &&
                          parentFormData[field.id]?.childrenData?.[field.ref] &&
                          parentFormData[field.id].childrenData[field.ref]
                            .length > 0;

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
            <p className="mt-1">{globalOwnerComments}</p>
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
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Back to Form
        </button>
        <button
          type="button"
          onClick={() => {
            const combinedData = { ...formData };

            Object.keys(parentFormData).forEach((parentId) => {
              if (
                parentFormData[parentId] &&
                parentFormData[parentId].childrenData
              ) {
                combinedData[parentId] = {
                  ...combinedData[parentId],
                  childrenData: parentFormData[parentId].childrenData,
                };
              }
            });

            onSubmit(combinedData);
          }}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Submit
        </button>
        <button
          type="button"
          onClick={() => {
            const combinedData = { ...formData };

            Object.keys(parentFormData).forEach((parentId) => {
              if (
                parentFormData[parentId] &&
                parentFormData[parentId].childrenData
              ) {
                combinedData[parentId] = {
                  ...combinedData[parentId],
                  childrenData: parentFormData[parentId].childrenData,
                };
              }
            });

            onSave(combinedData);
          }}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Save
        </button>
      </footer>
    </section>
  );
}
