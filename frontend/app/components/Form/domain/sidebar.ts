import type { ParsedStep } from "../types";
import { StepTreeBuilder, type StepWithChildren } from "./step-tree";

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


export function buildFlatSidebarPages(
  parsedSteps: ParsedStep[],
  openChildStepIds: Set<string>
): FlatSidebarPage[] {
  if (!parsedSteps.length) return [];

  const tree = new StepTreeBuilder<ParsedStep>(parsedSteps).buildTree();
  const stepIndexById = new Map<string, number>(
    parsedSteps.map((s, i) => [s.id, i])
  );

  const out: FlatSidebarPage[] = [];

  const visit = (node: StepWithChildren<ParsedStep>, depth: number): void => {
    const stepIndex = stepIndexById.get(node.id) ?? -1;
    if (stepIndex < 0) return;

    const isRoot = depth === 0;
    const shouldEmit = isRoot || openChildStepIds.has(node.id);

    if (shouldEmit) {
      node.pages.forEach((page, pageIndex) => {
        out.push({
          stepId: node.id,
          stepIndex,
          pageIndex,
          pageKey: page.pageKey,
          sidebarLabel: page.sidebar_label ?? {},
          pageLabel: page.pageLabel ?? {},
          depth,
        });
      });
    }

    (node.children ?? []).forEach((child) =>
      visit(child as StepWithChildren<ParsedStep>, depth + 1)
    );
  };

  tree.forEach((root) => visit(root, 0));

  return out;
}
