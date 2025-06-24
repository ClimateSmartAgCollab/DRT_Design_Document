// drt_frontend/app/components/Form/FieldRenderer.tsx
"use client";

import React from "react";
import DateTimeField from "./DateTimeField";
import { ParsedField, ParsedStep } from "./types";
import { useFormData } from "../Form/context/FormDataContext";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useTheme } from "./hooks/useTheme";

interface FieldRendererProps {
  /** RHF name & event handlers for this field */
  register: UseFormRegisterReturn;
  /** A unique ID (that matches register.name) for htmlFor / id */
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
}

export default function FieldRenderer({
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
}: FieldRendererProps) {
  const theme = useTheme();
  
  // pull in your context helpers
  const {
    createNewChild: ctxCreate,
    editExistingChild: ctxEdit,
    deleteChild: ctxDelete,
  } = useFormData();

  // Destructure RHF handlers & ref
  const {
    onChange: rhfOnChange,
    onBlur: rhfOnBlur,
    name: rhfName,
    ref: rhfRef,
  } = register;

  // Common field styles
  const fieldStyles = {
    border: `1px solid ${theme.colors.grey[300]}`,
    backgroundColor: theme.colors.white,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
  };

  const buttonStyles = {
    backgroundColor: theme.colors.primary,
    color: theme.colors.white,
    border: 'none',
    fontFamily: theme.fonts.body,
  };

  // 1) TEXTAREA
  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        name={rhfName}
        defaultValue={value ?? ""}
        placeholder={
          field.placeholder?.[language] || field.placeholder?.eng || ""
        }
        className="w-full rounded p-2"
        style={fieldStyles}
        // register the DOM ref both with RHF & your own ref-tracker
        ref={el => {
          rhfRef(el);
          registerFieldRef(field.id, el);
        }}
        onChange={e => {
          rhfOnChange(e);
          handleFieldChange(e.target.value);
        }}
        onBlur={e => {
          rhfOnBlur(e);
          saveCurrentPageData();
        }}
      />
    );
  }

  // 2) DATE/TIME (you'll need to wire register inside DateTimeField similarly)
  if (field.type === "DateTime") {
    return (
      <DateTimeField
        id={id}
        field={field}
        format={field.validation?.format || "YYYY-MM-DD"}
        fieldValue={value}
        register={{ onChange: rhfOnChange, onBlur: rhfOnBlur, name: rhfName, ref: rhfRef }}
        handleFieldChange={v => {
          rhfOnChange({ target: { value: v } } as any);
          handleFieldChange(v);
        }}
        saveCurrentPageData={saveCurrentPageData}
      />
    );
  }

  // 3) RADIO GROUP
  if (field.type === "radio") {
    return (
      <div
        className={`flex ${
          field.orientation === "vertical"
            ? "flex-col"
            : "flex-row space-x-4"
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
                ref={el => {
                  rhfRef(el);
                  registerFieldRef(field.id, el);
                }}
                onChange={e => {
                  rhfOnChange(e);
                  handleFieldChange(optKey);
                }}
                onBlur={e => {
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

  // 4) MULTI‐SELECT DROPDOWN
  if (field.type === "select" || field.type === "dropdown") {
    const selectedValues: string[] = Array.isArray(formData[stepId]?.[field.id])
      ? (formData[stepId][field.id] as string[])
      : [];

    return (
      <div>
        {/* Tags of selected */}
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedValues.length ? (
            selectedValues.map(k => (
              <span
                key={k}
                className="flex items-center rounded px-3 py-1 text-sm"
                style={{ 
                  backgroundColor: theme.colors.blue[100],
                  color: theme.colors.blue[900]
                }}
              >
                {field.options?.[language]?.[k] || k}
                <button
                  type="button"
                  onClick={() => {
                    const updated = selectedValues.filter(x => x !== k);
                    handleFieldChange(updated);
                    saveCurrentPageData();
                  }}
                  className="ml-2 hover:opacity-70"
                  style={{ color: theme.colors.secondary }}
                  aria-label={`Remove ${k}`}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm" style={{ color: theme.colors.grey[600] }}>
              No options selected.
            </p>
          )}
        </div>

        <select
          id={id}
          name={rhfName}
          multiple
          className="w-full rounded p-2"
          style={fieldStyles}
          value={selectedValues}
          ref={el => {
            rhfRef(el);
            registerFieldRef(field.id, el);
          }}
          onChange={e => {
            // standard multi‐select extraction
            const sel = Array.from(
              e.target.selectedOptions,
              o => o.value
            );
            handleFieldChange(sel);
            rhfOnChange(e);
            saveCurrentPageData();
          }}
          onBlur={e => {
            rhfOnBlur(e);
            saveCurrentPageData();
          }}
        >
          {Object.entries(field.options?.[language] || {}).map(
            ([optKey, optLabel]) => (
              <option key={optKey} value={optKey}>
                {optLabel}
              </option>
            )
          )}
        </select>

        {selectedValues.length > 0 && (
          <button
            className="mt-2 rounded px-3 py-1 text-white hover:opacity-90"
            style={{ backgroundColor: theme.colors.secondary }}
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

  // 5) REFERENCE (child‐step) — no change to RHF here
  if (field.type === "reference" && field.ref) {
    const children: any[] =
      parentFormData[field.id]?.childrenData?.[field.ref] || [];

    return (
      <div>
        <button
          type="button"
          onClick={() => {
            const newChild = ctxCreate(field.id, field.ref!);
            setIsNewChild(true);
            const idx = parsedSteps.findIndex(s => s.id === field.ref);
            if (idx >= 0) onNavigate(idx);
            window.scrollTo(0, 0);
          }}
          className="mt-2 rounded px-4 py-2 text-white hover:opacity-90"
          style={buttonStyles}
        >
          +
          {field.reference_button_text?.[language] ||
            field.reference_button_text?.eng ||
            " Child Step"}
        </button>

        {children.length > 0 && (
          <div 
            className="mt-4 rounded border p-4"
            style={{ 
              backgroundColor: theme.colors.grey[200],
              borderColor: theme.colors.grey[300]
            }}
          >
            {/* …render table of children… */}
          </div>
        )}
      </div>
    );
  }

  // 6) FALLBACK: simple text input
  return (
    <input
      id={id}
      name={rhfName}
      type="text"
      className="w-full rounded p-2"
      style={fieldStyles}
      value={value ?? ""}
      ref={el => {
        rhfRef(el);
        registerFieldRef(field.id, el);
      }}
      onChange={e => {
        rhfOnChange(e);
        handleFieldChange(e.target.value);
      }}
      onBlur={e => {
        rhfOnBlur(e);
        saveCurrentPageData();
      }}
    />
  );
}
