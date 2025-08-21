// drt_frontend/app/components/Form/hooks/useDynamicForm/validationSchema.ts
import type * as Yup from "yup";
import { YupSchemaFactory } from "../../domain/validation-schema";
import type { ParsedStep } from "../../types";


export function buildValidationSchema(steps: ParsedStep[]): Yup.ObjectSchema<any> {
  const factory = new YupSchemaFactory();
  return factory.build(steps as any);
}
