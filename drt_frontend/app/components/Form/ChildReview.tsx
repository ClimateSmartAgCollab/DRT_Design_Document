// drt_frontend\app\components\Form\ChildReview.tsx
"use client";

import React from "react";
import { ParsedField, ParsedStep } from "./types";
import { useFormData } from "../Form/context/FormDataContext";
import { useTheme } from "./hooks/useTheme";

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
  const theme = useTheme();
  const children = parentFormData[field.id]?.childrenData?.[field.ref!] || [];

  return (
    <div
      className="ml-4 mt-2 border-l-4 p-2"
      style={{ borderLeftColor: theme.colors.primary }}
    >
      <h5
        className="text-md font-semibold"
        style={{
          color: theme.colors.primary,
          fontFamily: theme.fonts.heading,
        }}
      >
        Child Entries for "
        {field.labels[language]?.[field.id] ||
          field.labels.eng?.[field.id] ||
          "Field"}
        "
      </h5>

      {children.length === 0 && (
        <p className="ml-4" style={{ color: theme.colors.grey[600] }}>
          No child structure found.
        </p>
      )}

      {children.map((child) => {
        const childStep = parsedSteps.find((s) => s.id === child.stepId);
        return (
          <div
            key={child.id}
            className="mt-2 p-2"
            style={{ backgroundColor: theme.colors.blue[100] }}
          >
            {childStep ? (
              childStep.pages.map((cPage) => (
                <div key={cPage.pageKey} className="ml-4">
                  {cPage.sections.map((cSection) => (
                    <div key={cSection.sectionKey} className="ml-4 mb-4">
                      <h6
                        className="text-lg font-medium"
                        style={{
                          color: theme.colors.text,
                          fontFamily: theme.fonts.heading,
                        }}
                      >
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
                              <label
                                className="block text-sm font-semibold"
                                style={{ color: theme.colors.text }}
                              >
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
                            <strong style={{ color: theme.colors.text }}>
                              {cField.labels[language]?.[cField.id] ||
                                cField.labels.eng?.[cField.id] ||
                                cField.id}
                              :{" "}
                            </strong>
                            <span style={{ color: theme.colors.grey[600] }}>
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
              <p className="ml-4" style={{ color: theme.colors.grey[600] }}>
                No child structure found.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
