// drt_frontend/app/components/Form/domain/submission-mapper.ts

export type Question = {
  id: string;
  label: string;
  type: string;
  answer?: any;
  children?: Array<{ childId: string; questions: Array<{ id: string; label: string; type: string; answer: any }> }>;
};

export type StepLike = {
  id: string;
  pages: Array<{
    sections: Array<{
      fields: Array<{
        id: string;
        type: string;
        ref?: string;
        labels?: Record<string, Record<string, string>>;
      }>;
    }>;
  }>;
};

export class SubmissionMapper {
  constructor(
    private readonly steps: StepLike[],
    private readonly formData: Record<string, any>,
    private readonly parentFormData: Record<string, any>,
    private readonly language: string
  ) {}

  /** Parent-only steps = not referenced by others */
  private parentSteps(): StepLike[] {
    const referenced = new Set<string>();
    this.steps.forEach((s) =>
      s.pages.forEach((p) =>
        p.sections.forEach((sec) =>
          sec.fields.forEach((f) => {
            if (f.type === "reference" && f.ref) referenced.add(f.ref);
          })
        )
      )
    );
    return this.steps.filter((s) => !referenced.has(s.id));
  }

  /** Build review Questions (pure) */
  buildReviewQuestions(): Question[] {
    const out: Question[] = [];
    const parents = this.parentSteps();

    parents.forEach((step) => {
      step.pages.forEach((page) => {
        page.sections.forEach((section) => {
          section.fields.forEach((field) => {
            const label =
              field.labels?.[this.language]?.[field.id] ??
              field.labels?.["eng"]?.[field.id] ??
              "No label";
            const q: Question = {
              id: field.id,
              label,
              type: field.type,
              answer: this.formData[step.id]?.[field.id] ?? "",
            };

            if (field.type === "reference" && field.ref) {
              const childrenData =
                this.parentFormData[field.id]?.childrenData?.[field.ref];
              if (Array.isArray(childrenData)) {
                q.children = childrenData.map((child: any) => ({
                  childId: child.id,
                  questions: Object.entries(child.data || {}).map(
                    ([id, val]) => ({
                      id,
                      label: id,
                      type: "childField",
                      answer: val,
                    })
                  ),
                }));
              }
            }

            out.push(q);
          });
        });
      });
    });

    return out;
  }

  /** Convenience helper to wrap the review output */
  buildReviewOutput(): { submittedAt: string; questions: Question[]; title?: string } {
    return {
      submittedAt: new Date().toISOString(),
      questions: this.buildReviewQuestions(),
    };
  }
}
