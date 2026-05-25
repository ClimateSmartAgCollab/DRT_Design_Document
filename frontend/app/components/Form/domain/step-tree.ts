// drt_frontend/app/components/Form/domain/step-tree.ts

/** Structurally minimal shape to keep this module UI-agnostic */
export type StepLike = {
  id: string;
  pages: Array<{
    sections: Array<{
      fields: Array<{ type?: string; ref?: string } & Record<string, any>>;
    }>;
  }>;
};

export type StepPageLike = StepLike["pages"][number];

function isReferenceField(f: unknown): f is { type: "reference"; ref: string } {
  const field = f as { type?: string; ref?: string } | null | undefined;
  return !!field && field.type === "reference" && typeof field.ref === "string";
}

export class StepTreeBuilder<T extends StepLike = StepLike> {
  private readonly stepById: Map<string, T>;
  private readonly referenced: Set<string>;

  constructor(private readonly steps: T[]) {
    this.stepById = new Map(steps.map((s) => [s.id, s]));
    this.referenced = this.collectReferencedIds(steps);
  }

  private collectReferencedIds(steps: T[]): Set<string> {
    const ids = new Set<string>();
    steps.forEach((s) =>
      s.pages?.forEach((p) =>
        p.sections?.forEach((sec) =>
          sec.fields?.forEach((f) => {
            if (isReferenceField(f)) {
              ids.add(f.ref);
            }
          })
        )
      )
    );
    return ids;
  }

  /** True if a step is NOT referenced by any other step (i.e., a root/parent step) */
  isParentStep(step: T): boolean {
    return !this.referenced.has(step.id);
  }

  /** Return ONLY parent steps (roots) in original order */
  getParentSteps(): T[] {
    return this.steps.filter((s) => this.isParentStep(s));
  }

  /** Find the FIRST step that references the `childId` */
  getReferencingStep(childId: string): T | undefined {
    return this.steps.find((s) =>
      s.pages.some((p) =>
        p.sections.some((sec) =>
          sec.fields.some((f) => isReferenceField(f) && f.ref === childId)
        )
      )
    );
  }

  /** Look up a step by id. */
  getStep(id: string): T | undefined {
    return this.stepById.get(id);
  }

  /**
   * Used by the sidebar to nest child schemas
   * directly under the page that opens them.
   */
  getChildRefsOnPage(page: StepPageLike): string[] {
    const refs: string[] = [];
    const seen = new Set<string>();
    page.sections?.forEach((sec) =>
      sec.fields?.forEach((f) => {
        if (isReferenceField(f) && !seen.has(f.ref)) {
          seen.add(f.ref);
          refs.push(f.ref);
        }
      })
    );
    return refs;
  }
}
