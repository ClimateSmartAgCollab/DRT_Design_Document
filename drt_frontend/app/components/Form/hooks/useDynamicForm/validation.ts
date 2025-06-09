// drt_frontend\app\components\Form\hooks\useDynamicForm\validation.ts

import { Page_parsed, Field } from "../../../type";
import { isValid__UTF8 } from "./utils";

export type FieldErrors = Record<string, string>;


/**
 * Validate a single field’s value (string or array of strings) using:
 * - required (conformance)
 * - regex (format)
 * - entry codes (entryCodes)
 * - UTF-8 encoding test (characterEncoding)
 * - dropdown allowed values
 */
export function validateField(
  field: Field,
  userInput: string | string[],
  language: string
): string | null {
  const { conformance, format, entryCodes, characterEncoding } = field.validation;

  // Required
  if (conformance === "M" && !userInput) {
    return "This field is required.";
  }

  if (typeof userInput === "string") {
    if (format && !new RegExp(format).test(userInput)) {
      return `Please match the format: ${format}`;
    }
    if (entryCodes && entryCodes.length > 0 && !entryCodes.includes(userInput)) {
      return `Value must be one of: ${entryCodes.join(", ")}`;
    }
    if (characterEncoding === "utf-8" && !(new TextDecoder("utf-8", { fatal: true })).decode(new TextEncoder().encode(userInput))) {
      return "Invalid UTF-8 characters detected.";
    }
    if (field.options?.[language]?.[field.id]) {
      const allowed = field.options[language][field.id];
      if (allowed.length > 0 && !allowed.includes(userInput)) {
        return `Value must be one of these: ${allowed.join(", ")}`;
      }
    }
  } else if (Array.isArray(userInput)) {
    for (const item of userInput) {
      if (format && !new RegExp(format).test(item)) {
        return `Each item must match the format: ${format}`;
      }
      if (entryCodes && entryCodes.length > 0 && !entryCodes.includes(item)) {
        return `Each item must be one of: ${entryCodes.join(", ")}`;
      }
      if (characterEncoding === "utf-8" && !(new TextDecoder("utf-8", { fatal: true })).decode(new TextEncoder().encode(item))) {
        return "Invalid UTF-8 characters in one or more items.";
      }
      if (field.options?.[language]?.[field.id]) {
        const allowed = field.options[language][field.id];
        if (allowed.length > 0 && !allowed.includes(item)) {
          return `Each item must be one of these: ${allowed.join(", ")}`;
        }
      }
    }
  }
  return null;
}


/**
 * Validate all fields on the current page.
 * - `parsedSteps`: full array of all steps
 * - `currentStepIdx`: index of the active step
 * - `pageIndexByStep`: mapping from stepId→current page index
 * - `language`: "eng" or other
 * - `formFieldRefs`: ref map from fieldId→HTML element
 * - `setFieldErrors`: setter function to update fieldErrors state
 */
export function validateCurrentPageData(
  parsedSteps: Page_parsed[][] | any[], 
  currentStepIdx: number,
  pageIndexByStep: Record<string, number>,
  language: string,
  formFieldRefs: React.MutableRefObject<
    Record<
      string,
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    >
  >,
  setFieldErrors: (errs: FieldErrors) => void
): boolean {
  const stepObj: any = parsedSteps[currentStepIdx];
  if (!stepObj) return false;

  const stepId = stepObj.id;
  const currentPageIndex = pageIndexByStep[stepId] ?? 0;
  const currentPage: Page_parsed | undefined = stepObj.pages[currentPageIndex];


  if (!stepObj || !stepObj.pages[currentPageIndex]) {
    console.warn("no step or no page found");
    // console.groupEnd();
    return false;
  }

  if (!currentPage) return false;

  let hasError = false;
  const newErrors: FieldErrors = {};

  currentPage.sections.forEach((section: any) => {
    section.fields.forEach((field: any) => {
      const refEl = formFieldRefs.current[field.id];
      if (!refEl) return;

      let userInput: string | string[] = "";

      if (!refEl) {
        // console.log("  → SKIPPING (no ref)");
        return;
      }

      if (field.type === "select" || field.type === "dropdown") {
        // gather all selected options
        const selectEl = refEl as HTMLSelectElement;
        userInput = Array.from(selectEl.selectedOptions).map(
          (opt) => opt.value
        );
      } else if (field.type === "radio") {
        userInput = (refEl as HTMLInputElement).value || "";
      } else {
        userInput = (refEl as HTMLInputElement | HTMLTextAreaElement).value;
      }

      if (typeof userInput === "string" && !isValid__UTF8(userInput)) {
        // We allow invalid chars but warn
        console.warn(`Field "${field.id}" has invalid UTF-8 characters`);
      }

      const errorMsg = validateField(field as Field, userInput, language);

      if (errorMsg) {
        hasError = true;
        newErrors[field.id] = errorMsg;
      }
    });
  });


  setFieldErrors(newErrors);
  return !hasError;
}
