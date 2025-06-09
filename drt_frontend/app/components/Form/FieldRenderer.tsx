// drt_frontend\app\components\Form\FieldRenderer.tsx
"use client";

import React from "react";
import DateTimeField from "./DateTimeField";
import { ParsedField, ParsedStep } from "./types";
import { useFormData } from "../Form/context/FormDataContext";

interface FieldRendererProps {
  field: ParsedField;
  value: any;
  language: string;
  registerFieldRef: (
    id: string,
    el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  ) => void;
  handleFieldChange: (newVal: any) => void;
  saveCurrentPageData: () => void;
  formData: Record<string, Record<string, any>>;
  stepId: string;
  createNewChild: (parentFieldId: string, childStepId: string) => any;
  editExistingChild: (parentFieldId: string, childId: string) => any | null;
  deleteChild: (childId: string, parentFieldId: string, childStepId: string) => void;
  onNavigate: (stepIndex: number, pageIndex?: number) => void;
  parsedSteps: ParsedStep[];
  parentFormData: Record<string, any>;
  currentChildId: string | null;
  currentChildParentId: string | null;
  isNewChild: boolean;
  setIsNewChild: (v: boolean) => void;
}

export default function FieldRenderer({
  field,
  value,
  language,
  registerFieldRef,
  handleFieldChange,
  saveCurrentPageData,
  formData,
  stepId,
  onNavigate,
  parsedSteps,
  parentFormData,
  setIsNewChild,
}: FieldRendererProps) {
  const { createNewChild: ctxCreate, editExistingChild: ctxEdit, deleteChild: ctxDelete } =
    useFormData();

  // TEXTAREA FIELD
  if (field.type === "textarea") {
    return (
      <textarea
        name={field.id}
        value={value || ""}
        placeholder={field.placeholder?.[language] || field.placeholder?.eng || ""}
        className="w-full rounded border p-2"
        ref={(el) => registerFieldRef(field.id, el)}
        onChange={(e) => handleFieldChange(e.target.value)}
        onBlur={saveCurrentPageData}
        onPaste={(e) => {
          const txt = e.clipboardData.getData("text");
          // (Optional) Re‐validate UTF-8 if needed
        }}
      />
    );
  }

  // DATE/TIME FIELD
  if (field.type === "DateTime") {
    return (
      <DateTimeField
        field={field}
        format={field.validation?.format || "YYYY-MM-DD"}
        fieldValue={value}
        registerFieldRef={(el) => registerFieldRef(field.id, el as unknown as HTMLTextAreaElement | null)}
        handleFieldChange={(v) => handleFieldChange(v)}
        saveCurrentPageData={saveCurrentPageData}
      />
    );
  }

  // RADIO FIELD
  if (field.type === "radio") {
    return (
      <div
        className={`flex ${
          field.orientation === "vertical" ? "flex-col" : "flex-row space-x-4"
        }`}
      >
        {Object.entries(field.options?.[language] || {}).map(([optKey, optLabel]) => (
          <label key={optKey} className="flex items-center space-x-2">
            <input
              type="radio"
              name={field.id}
              value={optKey}
              checked={value === optKey}
              onChange={() => handleFieldChange(optKey)}
              onBlur={saveCurrentPageData}
            />
            <span>{optLabel}</span>
          </label>
        ))}
      </div>
    );
  }

  // SELECT / DROPDOWN (multi‐select)
  if (field.type === "select" || field.type === "dropdown") {
    const selectedValues: string[] = Array.isArray(formData[stepId]?.[field.id])
      ? (formData[stepId][field.id] as string[])
      : [];

    return (
      <div>
        {/* Display selected values as removable tags */}
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedValues.length > 0 ? (
            selectedValues.map((optKey) => (
              <span
                key={optKey}
                className="flex items-center rounded bg-blue-100 px-3 py-1 text-sm text-blue-800"
              >
                {field.options?.[language]?.[optKey] || optKey}
                <button
                  type="button"
                  className="ml-2 text-red-500 hover:text-red-700"
                  onClick={() => {
                    const filtered = selectedValues.filter((k) => k !== optKey);
                    handleFieldChange(filtered);
                    saveCurrentPageData();
                  }}
                  aria-label={`Remove ${optKey}`}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-500">No options selected.</p>
          )}
        </div>

        <select
          name={field.id}
          multiple
          className="w-full rounded border p-2"
          value={selectedValues}
          onChange={(e) => {
            const sel = Array.from(e.target.selectedOptions, (o) => o.value);
            const min = field.validation?.cardinality?.min || 0;
            const max = field.validation?.cardinality?.max || Infinity;

            if (sel.length < min) {
              alert(`You must select at least ${min} options.`);
              return;
            }
            if (sel.length > max) {
              alert(`You can select at most ${max} options.`);
              return;
            }

            handleFieldChange(sel);
            saveCurrentPageData();
          }}
          onBlur={() => {
            saveCurrentPageData();
            handleFieldChange(selectedValues);
          }}
          ref={(el) => registerFieldRef(field.id, el as HTMLInputElement | HTMLTextAreaElement | null)}
        >
          {Object.entries(field.options?.[language] || {}).map(([optKey, optLabel]) => (
            <option key={optKey} value={optKey}>
              {optLabel}
            </option>
          ))}
        </select>

        {selectedValues.length > 0 && (
          <button
            className="mt-2 rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
            type="button"
            onClick={() => {
              handleFieldChange([]);
              saveCurrentPageData();
            }}
          >
            Clear All
          </button>
        )}
      </div>
    );
  }

  // REFERENCE FIELD (Child step logic)
  if (field.type === "reference" && field.ref) {
    const childrenForThisField: any[] =
      parentFormData[field.id]?.childrenData?.[field.ref] || [];

    return (
      <div>
        <button
          type="button"
          onClick={() => {
            // Create a new child record via context
            const newChild = ctxCreate(field.id, field.ref!);
            setIsNewChild(true);
            // Immediately navigate to that child step
            const targetIndex = parsedSteps.findIndex((s) => s.id === field.ref);
            if (targetIndex >= 0) onNavigate(targetIndex);
            window.scrollTo(0, 0);
          }}
          className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          +{" "}
          {field.reference_button_text?.[language] ||
            field.reference_button_text?.eng ||
            "+ Child Step"}
        </button>

        {childrenForThisField.length > 0 && (
          <div className="mt-4 rounded border bg-gray-100 p-4">
            <h4 className="mb-2 text-lg font-semibold">
              {parsedSteps.find((s) => s.id === field.ref)?.names[language]}
            </h4>
            <table className="w-full table-fixed border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="w-64 border border-gray-300 px-4 py-2 text-left">
                    Attributes
                  </th>
                  <th className="w-32 border border-gray-300 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {childrenForThisField.map((child) => (
                  <tr key={child.id}>
                    <td className="break-words border border-gray-300 px-4 py-2">
                      {field.showing_attribute?.map((attr) => (
                        <div key={attr} className="mt-2 text-sm text-gray-700">
                          <strong>{attr}: </strong>
                          <span>{child.data[attr] || "(No Data)"}</span>
                        </div>
                      ))}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Edit this child: navigate to its step
                            setIsNewChild(false);
                            const idx = parsedSteps.findIndex(
                              (s) => s.id === child.stepId
                            );
                            if (idx >= 0) onNavigate(idx);
                          }}
                          className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            ctxDelete(child.id, field.id, field.ref!);
                          }}
                          className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // FALLBACK: Simple text input
  return (
    <input
      type="text"
      className="mt-1 p-2 border rounded w-full"
      value={value || ""}
      onChange={(e) => handleFieldChange(e.target.value)}
      onBlur={saveCurrentPageData}
      ref={(el) => registerFieldRef(field.id, el)}
    />
  );
}
