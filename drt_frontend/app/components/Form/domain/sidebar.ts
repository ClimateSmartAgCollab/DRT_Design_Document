import type { ParsedStep } from "../types";

export class StepIndexResolver {
  static get(steps: ParsedStep[], id: string) {
    return steps.findIndex((s) => s.id === id);
  }
}
