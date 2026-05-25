import type { ParsedStep } from "../types";
import { StepTreeBuilder } from "./step-tree";

export class StepIndexResolver {
  static get(steps: ParsedStep[], id: string) {
    return steps.findIndex((s) => s.id === id);
  }
}

export interface FlatSidebarPage {
  stepId: string;
  stepIndex: number;
  pageIndex: number;
  pageKey: string;
  sidebarLabel: Record<string, string>;
  pageLabel: Record<string, string>;
  depth: number;
}


export type OpenChildStepMap = Map<string, string>;


export function buildFlatSidebarPages(
  parsedSteps: ParsedStep[],
  openChildSteps: OpenChildStepMap
): FlatSidebarPage[] {
  if (!parsedSteps.length) return [];

  const tree = new StepTreeBuilder<ParsedStep>(parsedSteps);
  const stepIndexById = new Map<string, number>(
    parsedSteps.map((s, i) => [s.id, i])
  );

  const out: FlatSidebarPage[] = [];


  const emittedStepIds = new Set<string>();

  const visitStep = (step: ParsedStep, depth: number): void => {
    const stepIndex = stepIndexById.get(step.id) ?? -1;
    if (stepIndex < 0) return;
    if (emittedStepIds.has(step.id)) return;
    emittedStepIds.add(step.id);

    step.pages.forEach((page, pageIndex) => {
      out.push({
        stepId: step.id,
        stepIndex,
        pageIndex,
        pageKey: page.pageKey,
        sidebarLabel: page.sidebar_label ?? {},
        pageLabel: page.pageLabel ?? {},
        depth,
      });

      tree.getChildRefsOnPage(page).forEach((childId) => {
        if (!openChildSteps.has(childId)) return;
        const pinned = openChildSteps.get(childId) ?? "";
        if (pinned && pinned !== page.pageKey) return;

        const childStep = tree.getStep(childId);
        if (!childStep) return;
        visitStep(childStep, depth + 1);
      });
    });
  };

  tree.getParentSteps().forEach((root) => visitStep(root, 0));

  return out;
}
