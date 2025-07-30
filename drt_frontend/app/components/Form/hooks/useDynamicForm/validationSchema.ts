// drt_frontend/app/components/Form/hooks/useDynamicForm/validationSchema.ts
import * as Yup from "yup";
import { ParsedStep } from "../../types";

const utf8Test = (value?: string) => {
  if (value == null) return true;
  try {
    // Will throw if invalid
    new TextDecoder("utf-8", { fatal: true }).decode(
      new TextEncoder().encode(value)
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * Build a nested schema of shape:
 * {
 *   [stepId]: Yup.object({
 *     [fieldId]: <rules>
 *   }),
 *   …
 * }
 */
export function buildValidationSchema(steps: ParsedStep[]) {
  const shape: Record<string, Yup.ObjectSchema<any>> = {};

  steps.forEach((step) => {
    const fieldsShape: Record<string, any> = {};

    step.pages.forEach((page) =>
      page.sections.forEach((section) =>
        section.fields.forEach((field) => {
          let schema: Yup.Schema<any>;

          // Base on field type
          switch (field.type) {
            case "textarea":
            case "text":
              schema = Yup.string();
              break;
            case "select":
            case "dropdown": {
              let arr = Yup.array().of(
                Yup.string().oneOf(
                  Object.keys(field.options?.eng || {}),
                  `Must be one of: ${Object.keys(field.options?.eng || []).join(
                    ", "
                  )}`
                )
              );
              // cardinality:
              const { min, max } = field.validation?.cardinality || {};
              if (typeof min === "number") {
                arr = arr.min(min, `Select at least ${min} options`);
              }
              if (typeof max === "number") {
                arr = arr.max(max, `Select at most ${max} options`);
              }
              schema = arr;
              break;
            }
            case "radio": {
              let s = Yup.string();
              if (Array.isArray(field.validation?.entryCodes)) {
                s = s.oneOf(
                  field.validation.entryCodes,
                  `Must be one of: ${field.validation.entryCodes.join(", ")}`
                );
              }
              schema = s;
              break;
            }
            case "DateTime":
              schema = Yup.string(); // or more complex Date parsing
              break;
            default:
              schema = Yup.mixed();
          }

          // required / conformance
          if (field.validation?.conformance === "M") {
            schema = (schema as any).required("This field is required");
          }

          // regex / format
          if (
            field.validation?.format &&
            typeof field.validation.format === "string"
          ) {
            schema = (schema as Yup.StringSchema).matches(
              new RegExp(field.validation.format),
              `Must match format ${field.validation.format}`
            );
          }

        //   // entryCodes → oneOf
        //   if (
        //     Array.isArray(field.validation?.entryCodes) &&
        //     field.validation.entryCodes.length > 0
        //   ) {
        //     schema = (schema as Yup.StringSchema).oneOf(
        //       field.validation.entryCodes,
        //       `Must be one of: ${field.validation.entryCodes.join(", ")}`
        //     );
        //   }

          // characterEncoding utf-8
          if (field.validation?.characterEncoding === "utf-8") {
            schema = (schema as Yup.StringSchema).test(
              "utf8",
              "Invalid UTF-8 characters detected",
              utf8Test
            );
          }

          fieldsShape[field.id] = schema;
        })
      )
    );

    shape[step.id] = Yup.object().shape(fieldsShape);
  });

  return Yup.object().shape(shape);
}
