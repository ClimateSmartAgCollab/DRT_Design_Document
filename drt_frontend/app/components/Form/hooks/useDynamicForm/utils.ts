// drt_frontend\app\components\Form\hooks\useDynamicForm\utils.ts

import { Step } from '../../../type'
import { StepGraph } from "../../domain/form-graph";
import { Utf8Codec } from "../../domain/validation";


export function isValid__UTF8(text: string): boolean {
  return Utf8Codec.isValid(text);
}

// Scan a Step for any `field.ref` values; return all referenced step IDs.
export const extractRefs = (step: Step): string[] => {
  return StepGraph.extractRefs(step);
};

// Sort steps topologically based on their references.
export function sortStepsByReferences(steps: Step[]): Step[] {
  const graph = new StepGraph<Step>(steps);
  return graph.topologicallySorted();
}
