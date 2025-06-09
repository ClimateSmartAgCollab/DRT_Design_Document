// drt_frontend\app\components\Form\types.ts


import {
  Step,
  Page_parsed,
  Field,
} from "../type";

import { ChildRecord, ParentFormData } from "../Form/context/FormDataContext";

/**
 * ParsedStep is the same as Step, but with a more descriptive name.
 * It represents a step in the form, which can contain multiple pages.
 */
export type ParsedStep = Step;
export type ParsedPage = Page_parsed;

/**
 * ParsedSection is a section within a step, containing fields.
 * It has a sectionKey (unique identifier) and sectionLabel (localized labels).
 */
export interface ParsedSection {
  sectionKey: string;
  sectionLabel: Record<string, string>;
  fields: Field[];
}

/**
 * Each individual field (text, date, radio, dropdown, reference, etc.)
 */
export type ParsedField = Field;


export interface UseDynamicFormReturn {
  language: string;
  setLanguage: (lang: string) => void;

  currentStep: number;
  visitedSteps: Set<string>;

  formData: Record<string, Record<string, any>>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>>>>;

  parentSteps: ParsedStep[];
  onNavigate: (index: number) => void;
  finishHandler: () => void;
  cancelHandler: () => void;
  isParentStep: (step: ParsedStep) => boolean;

  setCurrentChildId: (id: string | null) => void;
  currentChildId: string | null;
  setCurrentChildParentId: (id: string | null) => void;
  currentChildParentId: string | null;

  createNewChild: (parentFieldId: string, childStepId: string) => ChildRecord;
  editExistingChild: (parentFieldId: string, childId: string) => ChildRecord | null;
  deleteChild: (childId: string, parentFieldId: string, childStepId: string) => void;

  pageIndexByStep: Record<string, number>;
  expandedStep: string | null;
  setExpandedStep: (s: string | null) => void;

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
  handleSubmit_openAIRE: () => void;
  handleVerifyAndSubmit: (format: "json" | "license" | "odrl") => void;

  isNewChild: boolean;
  setIsNewChild: (v: boolean) => void;

  prefillCurrentPageData: () => void;
}


export interface FormProps {
  initialAnswers?: Record<string, Record<string, any>>;
  ownerComments?: Record<string, string>;
  globalOwnerComments?: string;
  onSave: (answers: Record<string, Record<string, any>>) => void;
  onSubmit: (answers: Record<string, Record<string, any>>) => void;
}
