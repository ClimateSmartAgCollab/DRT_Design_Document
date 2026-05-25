// drt_frontend\app\components\Form\types.ts

import { Step, Page_parsed, Field } from "../type";
import type React from "react";

import type { ChildRecord, ParentFormData } from "./domain/form-data";

export type ParsedStep = Step;
export type ParsedPage = Page_parsed;

export interface ParsedSection {
  sectionKey: string;
  sectionLabel: Record<string, string>;
  subheading?: Record<string, string>;
  fields: Field[];
}

export type ParsedField = Field;

export interface UseDynamicFormReturn {
  language: string;
  setLanguage: (lang: string) => void;

  currentStep: number;
  visitedSteps: Set<string>;

  formData: Record<string, Record<string, any>>;
  setFormData: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, any>>>
  >;

  parentSteps: ParsedStep[];
  onNavigate: (index: number) => void;
  finishHandler: () => void;
  cancelHandler: () => void;
  isParentStep: (step: ParsedStep) => boolean;

  // These two track the "active" child being edited
  setCurrentChildId: (id: string | null) => void;
  currentChildId: string | null;
  setCurrentChildParentId: (id: string | null) => void;
  currentChildParentId: string | null;

  createNewChild: (parentFieldId: string, childStepId: string) => ChildRecord;
  editExistingChild: (
    parentFieldId: string,
    childId: string
  ) => ChildRecord | null;
  deleteChild: (
    childId: string,
    parentFieldId: string,
    childStepId: string
  ) => void;

  pageIndexByStep: Record<string, number>;
  openChildStepIds: Map<string, string>;

  handleNavigate: (stepIndex: number) => void;
  handleNextPage: () => void;
  handlePreviousPage: () => void;

  isVeryLastPageOfLastStep: boolean;
  currentPage: ParsedPage | null;
  isLastPageOfThisStep: boolean;
  isFirstPageOfThisStep: boolean;
  step: ParsedStep;

  saveCurrentPageData: (updatedData?: Record<string, any>) => void;
  fieldErrors: Record<string, string>;
  handleFieldChange: (field: ParsedField, newVal: any) => void;
  registerFieldRef: (
    id: string,
    el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
  ) => void;

  reviewOutput: { title?: string; questions: any[] } | null;
  setReviewOutput: (v: { title?: string; questions: any[] } | null) => void;
  handleSubmit: () => void;
  handleVerifyAndSubmit: (format: "json" | "license" | "odrl") => void;

  isNewChild: boolean;
  setIsNewChild: (v: boolean) => void;

  prefillCurrentPageData: () => void;
  clearCurrentStepFormData: () => void;
}

export interface FormProps {
  initialAnswers?: Record<string, Record<string, any>>;
  ownerComments?: Record<string, string>;
  globalOwnerComments?: string;
  onSave: (answers: Record<string, Record<string, any>>) => void;
  onSubmit: (answers: Record<string, Record<string, any>>) => void;
  headerRightContent?: React.ReactNode;
  storageKey?: string;
}

// Re-export so consumers can continue importing from "types"
export type { ChildRecord, ParentFormData };
