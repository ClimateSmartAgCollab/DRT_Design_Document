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

export type StepWithChildren<T extends StepLike = StepLike> = T & {
  children?: T[];
};

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
            if (f?.type === "reference" && typeof f.ref === "string") {
              ids.add(f.ref);
            }
          })
        )
      )
    );
    return ids;
  }

  /** Build parent→children tree by materializing `children` arrays immutably */
  buildTree(): StepWithChildren<T>[] {
    const cloned: Record<string, StepWithChildren<T>> = {};
    this.steps.forEach((s) => (cloned[s.id] = { ...(s as any), children: [] }));

    this.steps.forEach((s) =>
      s.pages.forEach((p) =>
        p.sections.forEach((sec) =>
          sec.fields.forEach((f) => {
            if (f?.type === "reference" && f.ref && cloned[f.ref]) {
              cloned[s.id].children!.push(cloned[f.ref] as T);
            }
          })
        )
      )
    );

    // Roots = not referenced by any other step
    const roots = this.steps
      .filter((s) => !this.referenced.has(s.id))
      .map((s) => cloned[s.id]);

    return roots;
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
        p.sections.some((sec) => sec.fields.some((f) => f.ref === childId))
      )
    );
  }
}
