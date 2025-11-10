import type { ParsedField, ParsedStep } from "../types";

export interface ReferenceDeps {
  createNewChild: (parentFieldId: string, childStepId: string) => { id: string; stepId: string };
  deleteChild: (childId: string, parentFieldId: string, childStepId: string) => void;
  onNavigate: (stepIndex: number, pageIndex?: number) => void;
  findStepIndex: (steps: ParsedStep[], id: string) => number;
  clearCurrentStepFormData: () => void;
  setCurrentChildId: (id: string | null) => void;
  setCurrentChildParentId: (id: string | null) => void;
  setIsNewChild: (v: boolean) => void;
}

export class ReferenceFieldController {
  constructor(private readonly steps: ParsedStep[], private readonly deps: ReferenceDeps) {}

  openNew(field: ParsedField) {
    if (!field.ref) return;
    const child = this.deps.createNewChild(field.id, field.ref);
    this.deps.setCurrentChildId(child.id);
    this.deps.setCurrentChildParentId(field.id);
    this.deps.setIsNewChild(true);
    this.deps.clearCurrentStepFormData();

    const idx = this.deps.findStepIndex(this.steps, field.ref);
    if (idx >= 0) this.deps.onNavigate(idx);
    scrollTo(0, 0);
  }

  editExisting(field: ParsedField, child: { id: string; stepId: string }) {
    this.deps.setCurrentChildId(child.id);
    this.deps.setCurrentChildParentId(field.id);
    this.deps.setIsNewChild(false);
    this.deps.clearCurrentStepFormData();

    const idx = this.deps.findStepIndex(this.steps, child.stepId);
    if (idx >= 0) this.deps.onNavigate(idx);
  }

  delete(field: ParsedField, childId: string) {
    if (!field.ref) return;
    this.deps.deleteChild(childId, field.id, field.ref);
  }
}
