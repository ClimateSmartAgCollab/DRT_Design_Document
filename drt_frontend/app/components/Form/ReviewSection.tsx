// drt_frontend\app\components\Form\ReviewSection.tsx
"use client";

import React from "react";
import { ParsedStep } from "./types";
import ChildReview from "./ChildReview";

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
  const parentStepsForReview = parsedSteps.filter((step) => !childStepIds.has(step.id));

  return (
    <section className="flex flex-col min-h-screen">
      <header className="border-b pb-4">
        <h1 className="mb-2 text-center text-3xl font-bold">
          {reviewOutput.title || "Review Your Responses"}
        </h1>
        <p className="text-center text-lg text-gray-600">
          Please review your responses below.
        </p>
      </header>

      <main className="p-4 flex-1 overflow-auto">
        <div className="space-y-6">
          {parentStepsForReview.map((step) => (
            <div key={step.id} className="mb-6">
              <h2 className="text-2xl font-bold">
                {step.names[language] || step.names.eng}
              </h2>
              {step.pages.map((page) => (
                <div
                  key={page.pageKey}
                  className="mb-4 border-l-2 border-gray-300 pl-4"
                >
                  <h3 className="text-xl font-semibold">
                    {page.pageLabel[language] || page.pageLabel.eng}
                  </h3>
                  {page.sections.map((section) => (
                    <div
                      key={section.sectionKey}
                      className="mb-4 border-l-2 border-gray-200 pl-4"
                    >
                      <h4 className="text-lg font-medium">
                        {section.sectionLabel[language] || section.sectionLabel.eng}
                      </h4>
                      {section.fields.map((field) => {
                        const hasChildren =
                          field.type === "reference" &&
                          field.ref &&
                          parentFormData[field.id]?.childrenData?.[field.ref] &&
                          parentFormData[field.id].childrenData[field.ref].length > 0;

                        if (hasChildren) {
                          return (
                            <div key={field.id} className="mb-2">
                              <label className="block text-sm font-semibold text-gray-800">
                                {field.labels[language]?.[field.id] || field.labels.eng?.[field.id] || "No label"}
                              </label>
                              <ChildReview
                                field={field}
                                parsedSteps={parsedSteps}
                                language={language}
                              />
                            </div>
                          );
                        }

                        const fieldAnswer = formData[step.id]?.[field.id] ?? field.value;
                        return (
                          <div key={field.id} className="mb-4">
                            <label className="block text-sm font-semibold text-gray-800">
                              {field.labels[language]?.[field.id] || field.labels.eng?.[field.id]}
                            </label>
                            <div className="mt-1 break-words">
                              {Array.isArray(fieldAnswer)
                                ? fieldAnswer.join(", ")
                                : fieldAnswer?.toString() || "No response provided"}
                            </div>
                            {ownerComments?.[field.id] && (
                              <div className="mt-2 p-2 bg-yellow-100 text-sm rounded">
                                <strong>Owner Comment:</strong> {ownerComments[field.id]}
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
          <div className="mt-6 p-4 bg-yellow-100 rounded text-gray-800">
            <strong>Owner Comments:</strong>
            <p className="mt-1">{globalOwnerComments}</p>
          </div>
        )}
      </main>

      <footer className="flex justify-center space-x-4 py-4 border-t">
        <button
          type="button"
          onClick={() => setReviewOutput(null)}
          className="rounded-lg bg-blue-500 px-6 py-2 font-semibold text-white shadow hover:bg-blue-600 transition duration-200"
        >
          Back to Form
        </button>
        <button
          type="button"
          onClick={() => onSubmit(formData)}
          className="rounded-lg bg-blue-500 px-6 py-2 font-semibold text-white shadow hover:bg-blue-600 transition duration-200"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={() => onSave(formData)}
          className="rounded-lg bg-blue-500 px-6 py-2 font-semibold text-white shadow hover:bg-blue-600 transition duration-200"
        >
          Save
        </button>
      </footer>
    </section>
  );
}
