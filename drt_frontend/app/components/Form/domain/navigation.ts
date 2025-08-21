// drt_frontend/app/components/Form/domain/navigation.ts
//index math for pages/parents (pure)

import type { StepLike as TreeStepLike } from "./step-tree";
import { StepTreeBuilder } from "./step-tree";

export type StepLike = TreeStepLike;

export class NavigationService<T extends StepLike = StepLike> {
  private readonly tree: StepTreeBuilder<T>;
  private readonly parentSet: Set<string>;

  constructor(private readonly steps: T[], parentSteps?: T[]) {
    this.tree = new StepTreeBuilder<T>(steps);
    const parents = parentSteps ?? this.tree.getParentSteps();
    this.parentSet = new Set(parents.map((p) => p.id));
  }

  isParentStep(step: T): boolean {
    return this.parentSet.has(step.id);
  }

  /** Next parent index (in `steps[]`), or -1 if none */
  nextParentIndexFrom(currentIndex: number): number {
    const current = this.steps[currentIndex];
    if (!current) return -1;

    // Find current's parent index among parent list order
    const parents = this.steps.filter((s) => this.isParentStep(s as T));
    const parentIdx = parents.findIndex((p) => p.id === current.id);
    if (parentIdx < 0 || parentIdx >= parents.length - 1) return -1;

    const nextParentId = parents[parentIdx + 1].id;
    return this.steps.findIndex((s) => s.id === nextParentId);
  }

  /** Previous parent index (in `steps[]`), or -1 if none */
  prevParentIndexFrom(currentIndex: number): number {
    const current = this.steps[currentIndex];
    if (!current) return -1;

    const parents = this.steps.filter((s) => this.isParentStep(s as T));
    const parentIdx = parents.findIndex((p) => p.id === current.id);
    if (parentIdx <= 0) return -1;

    const prevParentId = parents[parentIdx - 1].id;
    return this.steps.findIndex((s) => s.id === prevParentId);
  }

  /** Compute next page or parent jump */
  nextPageOrParent(
    currentIndex: number,
    pageIndexByStep: Record<string, number>
  ): { stepIndex: number; pageIndex: number } | null {
    const step = this.steps[currentIndex];
    if (!step) return null;

    const currentPage = pageIndexByStep[step.id] ?? 0;
    const lastPageIdx = (step.pages?.length ?? 1) - 1;

    if (currentPage < lastPageIdx) {
      return { stepIndex: currentIndex, pageIndex: currentPage + 1 };
    }

    // At last page: if parent, jump to next parent’s first page
    if (this.isParentStep(step as T)) {
      const nextParent = this.nextParentIndexFrom(currentIndex);
      if (nextParent >= 0) {
        return { stepIndex: nextParent, pageIndex: 0 };
      }
    }

    return null; // child step at last page → no automatic jump
  }

  /** Compute previous page or parent jump */
  prevPageOrParent(
    currentIndex: number,
    pageIndexByStep: Record<string, number>
  ): { stepIndex: number; pageIndex: number } | null {
    const step = this.steps[currentIndex];
    if (!step) return null;

    const currentPage = pageIndexByStep[step.id] ?? 0;

    if (currentPage > 0) {
      return { stepIndex: currentIndex, pageIndex: currentPage - 1 };
    }

    // At first page: if parent, jump to previous parent’s last page
    if (this.isParentStep(step as T)) {
      const prevParent = this.prevParentIndexFrom(currentIndex);
      if (prevParent >= 0) {
        const prevLast = (this.steps[prevParent].pages?.length ?? 1) - 1;
        return { stepIndex: prevParent, pageIndex: Math.max(prevLast, 0) };
      }
    }

    return null; // child first page → no automatic jump
    }

  /** Parent step that references a given child id (index in `steps[]`) */
  referencingStepIndex(childId: string): number {
    const ref = this.tree.getReferencingStep(childId);
    if (!ref) return -1;
    return this.steps.findIndex((s) => s.id === ref.id);
  }
}
