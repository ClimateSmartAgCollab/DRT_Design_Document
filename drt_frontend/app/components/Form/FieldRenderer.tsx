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
  setCurrentChildId: (id: string | null) => void;
  setCurrentChildParentId: (id: string | null) => void;
  fieldErrors: Record<string, string>;
  isValid__UTF8: (text: string) => boolean;
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
  setCurrentChildId,
  setCurrentChildParentId,
  fieldErrors,
  isValid__UTF8,
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
    border: "none",
    fontFamily: theme.fonts.body,
  };

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
        // register the DOM ref both with RHF & your own ref-tracker
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
        onPaste={e => {
          const pastedText = e.clipboardData.getData('text')
          if (!isValid__UTF8(pastedText)) {
            e.preventDefault()
            alert(
              'Pasted text contains invalid characters. Please use UTF-8 text only.'
            )
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
        handleFieldChange={handleFieldChange}
        saveCurrentPageData={saveCurrentPageData}
      />
    );
  }

  // 3) RADIO GROUP
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

  // 4) SELECT/DROPDOWN
  if (field.type === "select" || field.type === "dropdown") {
    const selectedValues: string[] = Array.isArray(formData[stepId]?.[field.id])
      ? (formData[stepId][field.id] as string[])
      : [];

    // Get the options for this specific field and language
    const fieldOptions = field.options?.[language]?.[field.id] || [];
    
    // Create key-value pairs where both key and value are the option string
    const optionsMap: Record<string, string> = {};
    if (Array.isArray(fieldOptions)) {
      fieldOptions.forEach((option) => {
        optionsMap[option] = option;
      });
    }

    return (
      <div>
        {/* Render checkboxes for each option */}
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
                  let updated: string[];
                  if (e.target.checked) {
                    updated = [...selectedValues, optKey];
                  } else {
                    updated = selectedValues.filter((x) => x !== optKey);
                  }
                  handleFieldChange(updated);
                  rhfOnChange({ target: { value: updated } } as any);
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

  // 5) REFERENCE FIELD → navigate to child
  if (field.type === "reference" && field.ref) {
    return (
      <div>
        <button
          type='button'
          onClick={() => {
            const newChild = ctxCreate(field.id, field.ref!)

            setCurrentChildId(newChild.id)
            setCurrentChildParentId(field.id)

            setIsNewChild(false)

            // Navigate to the child step
            const targetIndex = parsedSteps.findIndex(
              s => s.id === field.ref
            )

            if (targetIndex >= 0) {
              onNavigate(targetIndex)
            } else {
              console.warn(
                `Reference step not found for field: ${field.id}`
              )
            }
            scrollTo(0, 0)
          }}
          className='mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600'
        >
          +{' '}
          {field.reference_button_text?.[language] ||
            field.reference_button_text?.eng ||
            '+ Child Step'}
        </button>
        
        {/* Only display the table if there is at least one child */}
        {parentFormData[field.id] &&
          parentFormData[field.id].childrenData &&
          (
            parentFormData[field.id]?.childrenData?.[
              field.ref
            ] ?? []
          ).length > 0 && (
            <div className='mt-4 rounded border bg-gray-100 p-4'>
              <h4 className='mb-2 text-lg font-semibold'>
                {
                  parsedSteps.find(s => s.id === field.ref)
                    ?.names[language]
                }
              </h4>
              <table className='w-full table-fixed border border-gray-300'>
                <thead className='bg-gray-200'>
                  <tr>
                    {/* Fixed-width Name column */}
                    <th className='w-64 border border-gray-300 px-4 py-2 text-left'>
                      Attributes
                    </th>
                    {/* Fixed-width actions column without a header title */}
                    <th className='w-32 border border-gray-300 px-4 py-2'></th>
                  </tr>
                </thead>
                <tbody>
                  {(parentFormData[field.id]?.childrenData ??
                    {})[field.ref].map((child: any) => (
                    <tr key={child.id}>
                      <td className='break-words border border-gray-300 px-4 py-2'>
                        {/* Render each attribute value specified in field.showing_attribute */}
                        {field.showing_attribute?.map(
                          attr => (
                            <div
                              key={attr}
                              className='mt-2 text-sm text-gray-700'
                            >
                              <strong>{attr}: </strong>
                              <span>
                                {child.data[attr] || '(No Data)'}
                              </span>
                            </div>
                          )
                        )}
                      </td>
                      <td className='border border-gray-300 px-4 py-2 text-center'>
                        <div className='flex justify-center space-x-2'>
                          <button
                            type='button'
                            onClick={() => {
                              // Enter "edit mode"
                              setCurrentChildId(child.id)
                              setCurrentChildParentId(field.id)
                              const idx = parsedSteps.findIndex(
                                s => s.id === child.stepId
                              )
                              if (idx >= 0) {
                                onNavigate(idx)
                              }
                            }}
                            className='rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600'
                          >
                            Edit
                          </button>
                          <button
                            type='button'
                            onClick={() => {
                              ctxDelete(child.id, field.id, field.ref!)
                            }}
                            className='rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600'
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

  // 6) DEFAULT TEXT INPUT
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
