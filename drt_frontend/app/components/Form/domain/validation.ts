// drt_frontend/app/components/Form/domain/validation.ts

export type FieldErrors = Record<string, string>;

export interface FieldValidationMeta {
  conformance?: "M" | "O";
  format?: string;
  entryCodes?: string[];
  characterEncoding?: "utf-8" | string;
  cardinality?: { min?: number; max?: number };
}

export interface FieldLike {
  id: string;
  type: string;
  validation?: FieldValidationMeta;
  options?: Record<string, Record<string, string[]>>; // options[lang][fieldId] -> allowed[]
  [k: string]: any;
}

export interface PageLike {
  sections: Array<{ fields: FieldLike[] }>;
}

export interface StepLikeForValidation {
  id: string;
  pages: PageLike[];
}

export interface ValueProvider {
  /** Return user input for a given field; single string or array for multi-selects */
  get(field: FieldLike): string | string[];
}

/** Small, SSR-safe UTF-8 validator utility */
export class Utf8Codec {
  static isValid(text: string): boolean {
    if (!text) return true;
    try {
      // Guard if encoders are not available (SSR or very old envs)
      const Enc = typeof TextEncoder !== "undefined" ? TextEncoder : null;
      const Dec = typeof TextDecoder !== "undefined" ? TextDecoder : null;
      if (!Enc || !Dec) return true;
      const enc = new Enc();
      const dec = new Dec("utf-8", { fatal: true });
      dec.decode(enc.encode(text));
      return true;
    } catch {
      return false;
    }
  }
}

/** Pure validator for a single field */
export class FieldValidator {
  static validate(field: FieldLike, userInput: string | string[], language: string): string | null {
    const v = field.validation ?? {};
    const { conformance, format, entryCodes, characterEncoding } = v;

    const checkOne = (value: string): string | null => {
      if (format && !new RegExp(format).test(value)) {
        return `Please match the format: ${format}`;
      }
      if (entryCodes && entryCodes.length > 0 && !entryCodes.includes(value)) {
        return `Value must be one of: ${entryCodes.join(", ")}`;
      }
      if (characterEncoding === "utf-8" && !Utf8Codec.isValid(value)) {
        return "Invalid UTF-8 characters detected.";
      }
      const allowed = field.options?.[language]?.[field.id];
      if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(value)) {
        return `Value must be one of these: ${allowed.join(", ")}`;
      }
      return null;
    };

    // Required
    if (conformance === "M") {
      const empty =
        (typeof userInput === "string" && userInput.length === 0) ||
        (Array.isArray(userInput) && userInput.length === 0);
      if (empty) return "This field is required.";
    }

    if (typeof userInput === "string") {
      return checkOne(userInput);
    }

    if (Array.isArray(userInput)) {
      for (const item of userInput) {
        const err = checkOne(item);
        if (err) {
          // Make array-specific message clearer if needed
          if (err.startsWith("Value must be one of")) {
            return `Each item must be one of: ${err.replace("Value must be one of: ", "")}`;
          }
          if (err.startsWith("Please match the format")) {
            return err.replace("Please", "Each item must");
          }
          if (err === "Invalid UTF-8 characters detected.") {
            return "Invalid UTF-8 characters in one or more items.";
          }
          return err;
        }
      }
    }

    return null;
  }
}

/** Page-level validation that is DOM-agnostic via ValueProvider */
export class PageValidator {
  constructor(
    private readonly parsedSteps: StepLikeForValidation[],
    private readonly pageIndexByStep: Record<string, number>,
    private readonly language: string,
    private readonly valueProvider: ValueProvider
  ) {}

  validateCurrentPage(currentStepIdx: number): { ok: boolean; errors: FieldErrors } {
    const step = this.parsedSteps[currentStepIdx];
    if (!step) return { ok: false, errors: {} };

    const pageIdx = this.pageIndexByStep[step.id] ?? 0;
    const page = step.pages?.[pageIdx];
    if (!step || !page) {
      console.warn("no step or no page found");
      return { ok: false, errors: {} };
    }

    const errors: FieldErrors = {};
    let ok = true;

    page.sections.forEach((section) => {
      section.fields.forEach((field) => {
        const input = this.valueProvider.get(field);

        if (typeof input === "string" && !Utf8Codec.isValid(input)) {
          // Non-fatal warning (kept from your original behavior)
          console.warn(`Field "${field.id}" has invalid UTF-8 characters`);
        }

        const err = FieldValidator.validate(field, input, this.language);
        if (err) {
          ok = false;
          errors[field.id] = err;
        }
      });
    });

    return { ok, errors };
  }
}
