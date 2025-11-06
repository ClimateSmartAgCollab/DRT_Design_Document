// drt_frontend/app/components/Form/domain/validation.ts

import * as Yup from "yup";
import { OcaFormatParser } from "../../parser/utils/regex-parser";
import { FormatMessageGenerator } from "../../parser/utils/format-messages";

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
  options?: Record<string, Record<string, string[]>>;
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

    //1. Format validation
    const checkOne = (value: any): string | null => {
      if (!value && conformance !== "M") {
        return null;
      }
      
      const stringValue = String(value);
      
      if (format) {
        if (field.type === "Binary" || field.type === "Array[Binary]") {
          if (value instanceof File) {
            if (!OcaFormatParser.test(format, value.type)) {
              return FormatMessageGenerator.getErrorMessage(field.type, format);
            }
          } else if (stringValue) {
            if (!OcaFormatParser.test(format, stringValue)) {
              return FormatMessageGenerator.getErrorMessage(field.type, format);
            }
          }
        } else {
          if (!OcaFormatParser.test(format, stringValue)) {
            return FormatMessageGenerator.getErrorMessage(field.type, format);
          }
        }
      }
      
      // 2. Entry codes validation - use options as primary data source
      const optionsData = field.options?.[language]?.[field.id];
      if (optionsData) {
        if (Array.isArray(optionsData)) {
          if (optionsData.length > 0 && !optionsData.includes(stringValue)) {
            return `Value must be one of: ${optionsData.join(", ")}`;
          }
        } else if (typeof optionsData === 'object') {
          const validKeys = Object.keys(optionsData);
          if (validKeys.length > 0 && !validKeys.includes(stringValue)) {
            return `Value must be one of: ${validKeys.join(", ")}`;
          }
        }
      } else if (entryCodes && entryCodes.length > 0) {
        if (!entryCodes.includes(stringValue)) {
          return `Value must be one of: ${entryCodes.join(", ")}`;
        }
      }
      
      // 3. Character encoding validation
      if (characterEncoding === "utf-8" && !Utf8Codec.isValid(stringValue)) {
        return "Invalid UTF-8 characters detected.";
      }
      
      return null;
    };

    if (conformance === "M") {
      const empty =
        (typeof userInput === "string" && userInput.length === 0) ||
        (Array.isArray(userInput) && userInput.length === 0);
      if (empty) return "This field is required.";
    }

    if (Array.isArray(userInput) && v.cardinality) {
      const { min, max } = v.cardinality;
      
      if (typeof min === "number" && userInput.length < min) {
        return `At least ${min} ${min === 1 ? 'item' : 'items'} required`;
      }
      
      if (typeof max === "number" && userInput.length > max) {
        return `At most ${max} ${max === 1 ? 'item' : 'items'} allowed`;
      }
    }

    if (typeof userInput === "string" || typeof userInput === "number" || 
        userInput instanceof File || typeof userInput === "boolean") {
      return checkOne(userInput);
    }

    if (Array.isArray(userInput)) {
      for (let i = 0; i < userInput.length; i++) {
        const item = userInput[i];
        
        if (!item && conformance !== "M") {
          continue;
        }
        
        const err = checkOne(item);
        if (err) {
          if (err.startsWith("Value must be one of")) {
            return `Each item must be one of: ${err.replace("Value must be one of: ", "")}`;
          }
          if (err.startsWith("Please")) {
            return `Item ${i + 1}: ${err}`;
          }
          if (err === "Invalid UTF-8 characters detected.") {
            return `Invalid UTF-8 characters in item ${i + 1}.`;
          }
          return `Item ${i + 1}: ${err}`;
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


type ParsedStepLike = {
  id: string;
  pages: Array<{
    sections: Array<{
      fields: Array<
        {
          id: string;
          type: string;
          validation?: FieldValidationMeta;
          options?: Record<string, Record<string, string[]>>;
        } & Record<string, any>
      >;
    }>;
  }>;
};


export class YupSchemaFactory {
  build(steps: ParsedStepLike[]): Yup.ObjectSchema<any> {
    const shape: Record<string, Yup.ObjectSchema<any>> = {};
    const defaultLanguage = "eng";

    steps.forEach((step) => {
      const fieldsShape: Record<string, any> = {};

      step.pages.forEach((page) =>
        page.sections.forEach((section) =>
          section.fields.forEach((field) => {
            let schema: Yup.Schema<any>;

            if (field.type === "Numeric" || field.type === "Array[Numeric]") {
              schema = field.type.startsWith("Array[") 
                ? Yup.array().of(Yup.number())
                : Yup.number();
            } else if (field.type.startsWith("Array[")) {
              schema = Yup.array().of(Yup.mixed());
            } else {
              schema = Yup.mixed();
            }

            schema = schema.test(
              "oca-validation",
              (value: any) => {
                const error = FieldValidator.validate(field as FieldLike, value, defaultLanguage);
                return error === null;
              }
            );

            fieldsShape[field.id] = schema;
          })
        )
      );

      shape[step.id] = Yup.object().shape(fieldsShape);
    });

    return Yup.object().shape(shape);
  }
}
