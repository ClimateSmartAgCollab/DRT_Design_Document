// drt_frontend/app/components/Form/utils/steps.ts
import type { Step } from "../../type";
import { StepTreeBuilder, type StepWithChildren } from "../domain/step-tree";

/** Build a tree structure from steps based on reference relationships. */
export function buildStepTree(steps: Step[]): StepWithChildren<Step>[] {
  const builder = new StepTreeBuilder<Step>(steps);
  return builder.buildTree();
}

/** Get all parent steps that are not referenced by any other step. */
export function getParentSteps(steps: Step[]): Step[] {
  const builder = new StepTreeBuilder<Step>(steps);
  return builder.getParentSteps();
}

/** If a given step is a child, find its parent step. */
export function getReferencingStep(
  childId: string,
  steps: Step[]
): Step | undefined {
  const builder = new StepTreeBuilder<Step>(steps);
  return builder.getReferencingStep(childId);
}
