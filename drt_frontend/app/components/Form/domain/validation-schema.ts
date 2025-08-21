// drt_frontend/app/components/Form/domain/validation-schema.ts
import * as Yup from "yup";
import { Utf8Codec } from "./validation";

type ParsedStepLike = {
  id: string;
  pages: Array<{
    sections: Array<{
      fields: Array<
        {
          id: string;
          type: string;
          validation?: {
            conformance?: "M" | "O";
            format?: string;
            entryCodes?: string[];
            characterEncoding?: "utf-8" | string;
            cardinality?: { min?: number; max?: number };
          };
          options?: Record<string, Record<string, string[]>>;
        } & Record<string, any>
      >;
    }>;
  }>;
};

const utf8Test = (value?: string) => {
  if (value == null) return true;
  return Utf8Codec.isValid(value);
};

export class YupSchemaFactory {
  build(steps: ParsedStepLike[]) {
    const shape: Record<string, Yup.ObjectSchema<any>> = {};

    steps.forEach((step) => {
      const fieldsShape: Record<string, any> = {};

      step.pages.forEach((page) =>
        page.sections.forEach((section) =>
          section.fields.forEach((field) => {
            let schema: Yup.Schema<any>;

            switch (field.type) {
              case "textarea":
              case "text":
                schema = Yup.string();
                break;

              case "select":
              case "dropdown": {
                // assume multi-select; callers can narrow later if needed.
                let arr = Yup.array().of(
                  Yup.string().oneOf(
                    Object.keys(field.options?.eng || {}),
                    `Must be one of: ${Object.keys(field.options?.eng || []).join(", ")}`
                  )
                );
                const { min, max } = field.validation?.cardinality || {};
                if (typeof min === "number") arr = arr.min(min, `Select at least ${min} options`);
                if (typeof max === "number") arr = arr.max(max, `Select at most ${max} options`);
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

              //todo: handle date/time formats
              case "DateTime":
                schema = Yup.string(); 
                break;

              default:
                schema = Yup.mixed();
            }

            if (field.validation?.conformance === "M") {
              schema = (schema as any).required("This field is required");
            }

            if (field.validation?.format && typeof field.validation.format === "string") {
              schema = (schema as Yup.StringSchema).matches(
                new RegExp(field.validation.format),
                `Must match format ${field.validation.format}`
              );
            }

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
}
