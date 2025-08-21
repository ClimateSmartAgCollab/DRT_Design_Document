// drt_frontend/app/components/Form/domain/form-graph.ts

//Minimal structural shape for Steps to avoid over-coupling to UI types.
export type StepLike = {
  id: string;
  pages?: Array<{
    sections?: Array<{
      fields?: Array<{ ref?: string } & Record<string, any>>;
    }>;
  }>;
};

export class StepGraph<T extends StepLike = StepLike> {
  private stepsMap: Map<string, T>;

  constructor(private readonly steps: T[]) {
    this.stepsMap = new Map(steps.map((s) => [s.id, s]));
  }

  static extractRefs(step: StepLike): string[] {
    const refs: string[] = [];
    step.pages?.forEach((p) =>
      p.sections?.forEach((s) =>
        s.fields?.forEach((f) => {
          if (f && typeof f.ref === "string") refs.push(f.ref);
        })
      )
    );
    return refs;
  }

  //Kahn’s algorithm; if cycle or missing node → return original ordering.

  topologicallySorted(): T[] {
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    this.steps.forEach((s) => {
      graph[s.id] = [];
      inDegree[s.id] = 0;
    });

    this.steps.forEach((s) => {
      const refs = StepGraph.extractRefs(s);
      refs.forEach((refId) => {
        if (this.stepsMap.has(refId)) {
          graph[s.id].push(refId);
          inDegree[refId] = (inDegree[refId] || 0) + 1;
        } else {
          // Keeping console.warn to match previous behavior
          console.warn(`Referenced step id "${refId}" not found for step "${s.id}"`);
        }
      });
    });

    const queue: string[] = [];
    const rootId = this.steps[0]?.id;
    if (rootId && inDegree[rootId] === 0) queue.push(rootId);
    this.steps.forEach((s) => {
      if (s.id !== rootId && inDegree[s.id] === 0) queue.push(s.id);
    });

    const sortedIds: string[] = [];
    while (queue.length) {
      const current = queue.shift()!;
      sortedIds.push(current);
      for (const n of graph[current]) {
        inDegree[n]--;
        if (inDegree[n] === 0) queue.push(n);
      }
    }

    if (sortedIds.length !== this.steps.length) {
      console.warn("Cycle detected or missing nodes; returning unsorted steps.");
      return this.steps;
    }
    return sortedIds.map((id) => this.stepsMap.get(id)!);
  }
}
