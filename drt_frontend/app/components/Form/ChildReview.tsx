"use client";
import React, { useMemo } from "react";
import { ParsedField, ParsedStep } from "./types";
import { useFormData } from "../Form/context/FormDataContext";
import { useTheme } from "./hooks/useTheme";
import { ChildReviewPresenter } from "./domain/child-review";

interface ChildReviewProps {
  field: ParsedField;
  parsedSteps: ParsedStep[];
  language: string;
}

export default function ChildReview({ field, parsedSteps, language }: ChildReviewProps) {
  const { parentFormData } = useFormData();
  const theme = useTheme();

  const presenter = useMemo(
    () => new ChildReviewPresenter(parentFormData, parsedSteps, language),
    [parentFormData, parsedSteps, language]
  );
  // Get children from presenter (use presenter.children method/property)
    const children = typeof (presenter as any).children === "function"
      ? (presenter as any).children(field)
      : Array.isArray((presenter as any).children)
        ? (presenter as any).children
        : [];

  return (
    <div className="ml-4 mt-2 border-l-4 p-2" style={{ borderLeftColor: theme.colors.primary }}>
      <h5
        className="text-md font-semibold"
        style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
      >
        Child Entries for "{presenter.fieldLabel(field)}"
      </h5>

      {children.length === 0 && (
        <p className="ml-4" style={{ color: theme.colors.grey[600] }}>
          No child structure found.
        </p>
      )}

      {children.map((child: any) => (
        <div key={child.id} className="mt-2 p-2" style={{ backgroundColor: theme.colors.blue[100] }}>
          {child.step ? (
            child.step.pages.map((cPage: ParsedStep["pages"][number]) => (
              <div key={cPage.pageKey} className="ml-4">
                {cPage.sections.map((cSection) => (
                  <div key={cSection.sectionKey} className="ml-4 mb-4">
                    <h6
                      className="text-lg font-medium"
                      style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
                    >
                      {cSection.sectionLabel[language] || cSection.sectionLabel.eng}
                    </h6>

                    {cSection.fields.map((cField) => {
                      const nested = presenter.hasNestedChildren(cField);
                      if (nested) {
                        return (
                          <div key={cField.id} className="mb-1 ml-4">
                            <label className="block text-sm font-semibold" style={{ color: theme.colors.text }}>
                              {cField.labels[language]?.[cField.id] || cField.labels.eng?.[cField.id] || cField.id}
                            </label>
                            <ChildReview field={cField} parsedSteps={parsedSteps} language={language} />
                          </div>
                        );
                      }
                      const val = child.data[cField.id];
                      return (
                        <div key={cField.id} className="mb-1 ml-4 break-words">
                          <strong style={{ color: theme.colors.text }}>
                            {cField.labels[language]?.[cField.id] || cField.labels.eng?.[cField.id] || cField.id}:{" "}
                          </strong>
                          <span style={{ color: theme.colors.grey[600] }}>{presenter.valueToString(val)}</span>
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
      ))}
    </div>
  );
}
