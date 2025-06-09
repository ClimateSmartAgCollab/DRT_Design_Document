// drt_frontend\app\components\Form\utils\steps.ts

import { Step, Field } from "../../type";


/**
 * Get all parent steps that are not referenced by any other step.
 * This function identifies root steps in the step tree.
 * It returns only those steps that are not referenced by any other step.
 */
export function getParentSteps(steps: Step[]): Step[] {
  const rootStepIds = new Set<string>(steps.map((s) => s.id));

  steps.forEach((step) => {
    step.pages.forEach((page) => {
      page.sections.forEach((section) => {
        section.fields.forEach((field: Field) => {
          if (field.type === "reference" && field.ref) {
            rootStepIds.delete(field.ref);
          }
        });
      });
    });
  });

  return steps.filter((step) => rootStepIds.has(step.id));
}

/**
 * If a given step is a child, find its parent step.
 */
export function getReferencingStep(
  childId: string,
  steps: Step[]
): Step | undefined {
  return steps.find((step) =>
    step.pages.some((page) =>
      page.sections.some((section) =>
        section.fields.some((field) => field.ref === childId)
      )
    )
  );
}
