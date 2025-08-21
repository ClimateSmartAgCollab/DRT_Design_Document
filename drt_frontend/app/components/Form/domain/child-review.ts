import type { ParsedStep, ParsedField } from "../types";

type ParentFormData = Record<string, any>;

export class ChildReviewPresenter {
  constructor(
    private readonly parentFormData: ParentFormData,
    private readonly parsedSteps: ParsedStep[],
    private readonly language: string
  ) {}

  fieldLabel(field: ParsedField): string {
    return field.labels?.[this.language]?.[field.id] ||
           field.labels?.eng?.[field.id] ||
           "Field";
  }

  children(field: ParsedField) {
    const arr = this.parentFormData[field.id]?.childrenData?.[field.ref!] || [];
    return arr.map((child: any) => ({
      id: child.id,
      stepId: child.stepId,
      data: child.data,
      step: this.parsedSteps.find((s) => s.id === child.stepId),
    }));
  }

  valueToString(val: any): string {
    if (Array.isArray(val)) return val.join(", ");
    if (val == null) return "No response provided";
    return String(val);
  }

  hasNestedChildren(field: ParsedField): boolean {
    if (field.type !== "reference" || !field.ref) return false;
    const group = this.parentFormData[field.id]?.childrenData?.[field.ref];
    return Array.isArray(group) && group.length > 0;
  }
}
