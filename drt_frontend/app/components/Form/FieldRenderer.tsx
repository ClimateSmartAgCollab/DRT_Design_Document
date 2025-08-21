"use client";
import React, { useMemo } from "react";
import DateTimeField from "./DateTimeField";
import { ParsedField, ParsedStep } from "./types";
import { useFormData } from "../Form/context/FormDataContext";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useTheme } from "./hooks/useTheme";
import { OptionsMapper } from "./domain/field-options";
import {
  ReferenceFieldController,
  type ReferenceDeps,
} from "./domain/reference-controller";

interface FieldRendererProps {
  register: UseFormRegisterReturn;
  id: string;
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
  deleteChild: (
    childId: string,
    parentFieldId: string,
    childStepId: string
  ) => void;
  onNavigate: (stepIndex: number, pageIndex?: number) => void;
  parsedSteps: ParsedStep[];
  parentFormData: Record<string, any>;
  currentChildId: string | null;
  currentChildParentId: string | null;
  isNewChild: boolean;
  setIsNewChild: (v: boolean) => void;
  setCurrentChildId: (id: string | null) => void;
  setCurrentChildParentId: (id: string | null) => void;
  fieldErrors: Record<string, string>;
  isValid__UTF8: (text: string) => boolean;
  clearCurrentStepFormData: () => void;
}

export default function FieldRenderer(props: FieldRendererProps) {
  const {
    register,
    id,
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
    setCurrentChildId,
    setCurrentChildParentId,
    isValid__UTF8,
    clearCurrentStepFormData,
  } = props;

  const theme = useTheme();
  const { createNewChild: ctxCreate, deleteChild: ctxDelete } = useFormData();

  const {
    onChange: rhfOnChange,
    onBlur: rhfOnBlur,
    name: rhfName,
    ref: rhfRef,
  } = register;

  const fieldStyles = {
    border: `1px solid ${theme.colors.grey[300]}`,
    backgroundColor: theme.colors.white,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
  };

  const controller = useMemo(() => {
    const deps: ReferenceDeps = {
      createNewChild: ctxCreate,
      deleteChild: ctxDelete,
      onNavigate,
      findStepIndex: (steps, sid) => steps.findIndex((s) => s.id === sid),
      clearCurrentStepFormData,
      setCurrentChildId,
      setCurrentChildParentId,
      setIsNewChild,
    };
    return new ReferenceFieldController(parsedSteps, deps);
  }, [
    parsedSteps,
    ctxCreate,
    ctxDelete,
    onNavigate,
    clearCurrentStepFormData,
    setCurrentChildId,
    setCurrentChildParentId,
    setIsNewChild,
  ]);

  // 1) TEXTAREA
  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        name={rhfName}
        value={value ?? ""}
        placeholder={
          field.placeholder?.[language] || field.placeholder?.eng || ""
        }
        className="w-full rounded p-2"
        style={fieldStyles}
        ref={(el) => {
          rhfRef(el);
          registerFieldRef(field.id, el);
        }}
        onChange={(e) => {
          rhfOnChange(e);
          handleFieldChange(e.target.value);
        }}
        onBlur={(e) => {
          rhfOnBlur(e);
          saveCurrentPageData();
        }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text");
          if (!isValid__UTF8(pasted)) {
            e.preventDefault();
            alert(
              "Pasted text contains invalid characters. Please use UTF-8 text only."
            );
          }
        }}
      />
    );
  }

  // 2) DATE/TIME
  if (field.type === "DateTime") {
    return (
      <DateTimeField
        id={id}
        field={field}
        format={field.validation?.format || "YYYY-MM-DD"}
        fieldValue={value}
        register={register}
        handleFieldChange={(f, v) => handleFieldChange(v)}
        saveCurrentPageData={saveCurrentPageData}
      />
    );
  }

  // 3) RADIO
  if (field.type === "radio") {
    return (
      <div
        className={`flex ${
          field.orientation === "vertical" ? "flex-col" : "flex-row space-x-4"
        }`}
      >
        {Object.entries(field.options?.[language] || {}).map(
          ([optKey, optLabel]) => (
            <label
              key={optKey}
              htmlFor={`${id}-${optKey}`}
              className="flex items-center space-x-2"
              style={{ color: theme.colors.text, fontFamily: theme.fonts.body }}
            >
              <input
                id={`${id}-${optKey}`}
                type="radio"
                name={rhfName}
                value={optKey}
                checked={value === optKey}
                style={{ accentColor: theme.colors.primary }}
                ref={(el) => {
                  rhfRef(el);
                  registerFieldRef(field.id, el);
                }}
                onChange={(e) => {
                  rhfOnChange(e);
                  handleFieldChange(optKey);
                }}
                onBlur={(e) => {
                  rhfOnBlur(e);
                  saveCurrentPageData();
                }}
              />
              <span>{optLabel}</span>
            </label>
          )
        )}
      </div>
    );
  }

  // 4) SELECT/DROPDOWN (checkbox group UI)
  if (field.type === "select" || field.type === "dropdown") {
    const selectedValues = OptionsMapper.selected(formData, stepId, field.id);
    const optionsMap = OptionsMapper.map(field, language);

    return (
      <div>
        <div className="flex flex-col gap-2">
          {Object.entries(optionsMap).map(([optKey, optLabel]) => (
            <label
              key={optKey}
              htmlFor={`${id}-${optKey}`}
              className="flex items-center space-x-2"
              style={{ color: theme.colors.text, fontFamily: theme.fonts.body }}
            >
              <input
                id={`${id}-${optKey}`}
                type="checkbox"
                name={rhfName}
                value={optKey}
                checked={selectedValues.includes(optKey)}
                ref={(el) => {
                  rhfRef(el);
                  registerFieldRef(field.id, el);
                }}
                onChange={(e) => {
                  const updated = e.target.checked
                    ? [...selectedValues, optKey]
                    : selectedValues.filter((x) => x !== optKey);
                  handleFieldChange(updated);
                  // mimic RHF event for arrays
                  (rhfOnChange as any)({ target: { value: updated } });
                  saveCurrentPageData();
                }}
                onBlur={(e) => {
                  rhfOnBlur(e);
                  saveCurrentPageData();
                }}
                style={{ accentColor: theme.colors.primary }}
              />
              <span>{optLabel}</span>
            </label>
          ))}
        </div>

        {selectedValues.length > 0 && (
          <button
            className="mt-2 rounded px-3 py-1 text-white hover:opacity-90"
            style={{ backgroundColor: theme.colors.primary }}
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

  // 5) REFERENCE FIELD
  if (field.type === "reference" && field.ref) {
    const children = (parentFormData[field.id]?.childrenData?.[field.ref] ??
      []) as Array<any>;
    const childStepName = parsedSteps.find((s) => s.id === field.ref)?.names[
      language
    ];

    return (
      <div>
        <button
          type="button"
          onClick={() => controller.openNew(field)}
          className="mt-2 rounded px-3 py-1 text-white hover:opacity-90"
          style={{ backgroundColor: theme.colors.primary }}
        >
          +{" "}
          {field.reference_button_text?.[language] ||
            field.reference_button_text?.eng ||
            "+ Child Step"}
        </button>

        {children.length > 0 && (
          <div className="mt-4 rounded border bg-gray-100 p-4">
            <h4 className="mb-2 text-lg font-semibold">{childStepName}</h4>
            <table className="w-full table-fixed border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="w-64 border border-gray-300 px-4 py-2 text-left">
                    Attributes
                  </th>
                  <th className="w-32 border border-gray-300 px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {children.map((child) => (
                  <tr key={child.id}>
                    <td className="break-words border border-gray-300 px-4 py-2">
                      {field.showing_attribute?.map((attr) => {
                        const childStep = parsedSteps.find(
                          (s) => s.id === field.ref
                        );
                        const childField =
                          childStep?.pages?.[0]?.sections?.[0]?.fields?.find(
                            (f) => f.id === attr
                          );
                        const label =
                          childField?.labels?.[language]?.[attr] ||
                          childField?.labels?.eng?.[attr] ||
                          attr;
                        return (
                          <div
                            key={attr}
                            className="mt-2 text-sm text-gray-700"
                          >
                            <strong>{label}: </strong>
                            <span>{child.data[attr] || "(No Data)"}</span>
                          </div>
                        );
                      })}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <div className="flex justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => controller.editExisting(field, child)}
                          className="mt-2 rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => controller.delete(field, child.id)}
                          className="mt-2 rounded px-3 py-1 text-white hover:opacity-90"
                          style={{ backgroundColor: theme.colors.primary }}
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

  // 6) DEFAULT TEXT
  return (
    <input
      id={id}
      name={rhfName}
      type="text"
      className="w-full rounded p-2"
      style={fieldStyles}
      value={value ?? ""}
      ref={(el) => {
        rhfRef(el);
        registerFieldRef(field.id, el);
      }}
      onChange={(e) => {
        rhfOnChange(e);
        handleFieldChange(e.target.value);
      }}
      onBlur={(e) => {
        rhfOnBlur(e);
        saveCurrentPageData();
      }}
    />
  );
}
