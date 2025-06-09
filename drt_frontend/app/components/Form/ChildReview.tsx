// drt_frontend\app\components\Form\ChildReview.tsx
"use client";

import React from "react";
import { ParsedField, ParsedStep } from "./types";
import { useFormData } from "../Form/context/FormDataContext";

interface ChildReviewProps {
  field: ParsedField;
  parsedSteps: ParsedStep[];
  language: string;
}

export default function ChildReview({
  field,
  parsedSteps,
  language,
}: ChildReviewProps) {
  const { parentFormData } = useFormData();
  const children = parentFormData[field.id]?.childrenData?.[field.ref!] || [];

  return (
    <div className="ml-4 mt-2 border-l-4 border-blue-500 p-2">
      <h5 className="text-md font-semibold text-blue-700">
        Child Entries for "
        {field.labels[language]?.[field.id] ||
          field.labels.eng?.[field.id] ||
          "Field"}
        "
      </h5>

      {children.length === 0 && (
        <p className="ml-4 text-gray-500">No child structure found.</p>
      )}

      {children.map((child) => {
        const childStep = parsedSteps.find((s) => s.id === child.stepId);
        return (
          <div key={child.id} className="mt-2 bg-gray-100 p-2">
            {childStep ? (
              childStep.pages.map((cPage) => (
                <div key={cPage.pageKey} className="ml-4">
                  {cPage.sections.map((cSection) => (
                    <div key={cSection.sectionKey} className="ml-4 mb-4">
                      <h6 className="text-lg font-medium">
                        {cSection.sectionLabel[language] ||
                          cSection.sectionLabel.eng}
                      </h6>
                      {cSection.fields.map((cField) => {
                        const nestedChildren =
                          cField.type === "reference" &&
                          !!cField.ref &&
                          (parentFormData[cField.id]?.childrenData?.[cField.ref]
                            ?.length ?? 0) > 0;

                        if (nestedChildren) {
                          return (
                            <div key={cField.id} className="mb-1 ml-4">
                              <label className="block text-sm font-semibold text-gray-800">
                                {cField.labels[language]?.[cField.id] ||
                                  cField.labels.eng?.[cField.id] ||
                                  cField.id}
                              </label>
                              <ChildReview
                                field={cField}
                                parsedSteps={parsedSteps}
                                language={language}
                              />
                            </div>
                          );
                        }

                        const childAnswer = child.data[cField.id];
                        return (
                          <div
                            key={cField.id}
                            className="mb-1 ml-4 break-words"
                          >
                            <strong>
                              {cField.labels[language]?.[cField.id] ||
                                cField.labels.eng?.[cField.id] ||
                                cField.id}
                              :{" "}
                            </strong>
                            <span>
                              {Array.isArray(childAnswer)
                                ? childAnswer.join(", ")
                                : childAnswer?.toString() ||
                                  "No response provided"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="ml-4 text-gray-500">No child structure found.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
