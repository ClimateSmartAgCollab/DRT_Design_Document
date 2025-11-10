// drt_frontend\app\components\Form\hooks\useDynamicForm\validation.ts

import type { Page_parsed, Field } from "../../../type";
import {
  FieldValidator,
  Utf8Codec,
  PageValidator,
  type FieldErrors,
  type FieldLike,
  type ValueProvider,
} from "../../domain/validation";


export type { FieldErrors };

/** Bridge: turn refs/DOM into a ValueProvider the domain can consume */
class DomFormValueProvider implements ValueProvider {
  constructor(
    private readonly refs: React.MutableRefObject<
      Record<
        string,
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
      >
    >
  ) {}

  get(field: FieldLike): string | string[] {
    const el = this.refs.current[field.id];
    if (!el) return "";

    // Multi-select via checkboxes
    if (
      (field.type === "select" || field.type === "dropdown") &&
      el instanceof HTMLInputElement &&
      el.type === "checkbox"
    ) {
      const name = el.name;
      if (typeof document !== "undefined") {
        const checkboxes = document.querySelectorAll<HTMLInputElement>(
          `input[type=checkbox][name='${name}']`
        );
        return Array.from(checkboxes)
          .filter((cb) => cb.checked)
          .map((cb) => cb.value);
      }
      return [];
    }

    // Multi-select via <select multiple>
    if (
      (field.type === "select" || field.type === "dropdown") &&
      el instanceof HTMLSelectElement
    ) {
      const selectEl = el as HTMLSelectElement;
      return Array.from(selectEl.selectedOptions).map((opt) => opt.value);
    }

    // Radio or regular inputs/textareas
    if (field.type === "radio" && el instanceof HTMLInputElement) {
      return el.value || "";
    }

    return (el as HTMLInputElement | HTMLTextAreaElement).value ?? "";
  }
}

//Validate a single field’s value (string or array of strings).
export function validateField(
  field: Field,
  userInput: string | string[],
  language: string
): string | null {
  return FieldValidator.validate(
    field as unknown as FieldLike,
    userInput,
    language
  );
}

//Validate all fields on the current page.
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
  // Warn for invalid UTF-8 early (non-fatal)
  const provider = new DomFormValueProvider(formFieldRefs);
  const validator = new PageValidator(
    parsedSteps as any,
    pageIndexByStep,
    language,
    provider
  );
  const { ok, errors } = validator.validateCurrentPage(currentStepIdx);

  Object.entries(formFieldRefs.current).forEach(([id, el]) => {
    if (!el) return;
    const val = (el as HTMLInputElement | HTMLTextAreaElement).value ?? "";
    if (typeof val === "string" && !Utf8Codec.isValid(val)) {
      console.warn(`Field "${id}" has invalid UTF-8 characters`);
    }
  });

  setFieldErrors(errors);
  return ok;
}
