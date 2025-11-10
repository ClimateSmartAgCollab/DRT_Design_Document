// drt_frontend/app/components/Form/domain/form-data.ts

export type ParentId = string;
export type ChildId = string;
export type StepId = string;
export type FieldId = string;

export interface ChildRecord {
  id: ChildId;
  parentId: ParentId;
  stepId: StepId;
  data: Record<FieldId, any>;
}

export interface ParentRecord {
  [fieldId: string]: any;
  childrenData?: Record<StepId, ChildRecord[]>;
}

export interface ParentFormData {
  [parentId: ParentId]: ParentRecord;
}

/** ---------- Domain Entities (encapsulate behavior, keep shapes serializable) ---------- */

export class ChildEntity {
  constructor(
    public readonly id: ChildId,
    public readonly parentId: ParentId,
    public readonly stepId: StepId,
    private readonly _data: Record<FieldId, any> = {}
  ) {}

  get data(): Record<FieldId, any> {
    return this._data;
  }

  /** Returns a new ChildEntity with merged data (immutability) */
  withData(patch: Record<FieldId, any>): ChildEntity {
    return new ChildEntity(this.id, this.parentId, this.stepId, {
      ...this._data,
      ...patch,
    });
  }

  toJSON(): ChildRecord {
    return { id: this.id, parentId: this.parentId, stepId: this.stepId, data: { ...this._data } };
  }

  static from(record: ChildRecord): ChildEntity {
    return new ChildEntity(record.id, record.parentId, record.stepId, record.data ?? {});
  }
}

export class ParentEntity {
  constructor(
    public readonly parentId: ParentId,
    /** Arbitrary fields go here to avoid polluting the root object */
    private readonly _fields: Record<FieldId, any> = {},
    private readonly _childrenByStep: Record<StepId, ChildEntity[]> = {}
  ) {}

  get fields(): Record<FieldId, any> {
    return this._fields;
  }

  get childrenByStep(): Record<StepId, ChildEntity[]> {
    return this._childrenByStep;
  }

  getChildren(stepId?: StepId): ChildEntity[] {
    if (!stepId) {
      return Object.values(this._childrenByStep).flat();
    }
    return this._childrenByStep[stepId] ?? [];
  }

  findChild(childId: ChildId): ChildEntity | null {
    for (const arr of Object.values(this._childrenByStep)) {
      const found = arr.find((c) => c.id === childId);
      if (found) return found;
    }
    return null;
  }

  addChild(child: ChildEntity): ParentEntity {
    const arr = this._childrenByStep[child.stepId] ?? [];
    return new ParentEntity(
      this.parentId,
      { ...this._fields },
      {
        ...this._childrenByStep,
        [child.stepId]: [...arr, child],
      }
    );
  }

  upsertChild(childId: ChildId, patch: Record<FieldId, any>): ParentEntity {
    let updated = false;
    const next: Record<StepId, ChildEntity[]> = {};

    for (const [step, arr] of Object.entries(this._childrenByStep)) {
      const idx = arr.findIndex((c) => c.id === childId);
      if (idx === -1) {
        next[step] = arr;
        continue;
      }
      const current = arr[idx];
      const replaced = current.withData(patch);
      next[step] = [...arr.slice(0, idx), replaced, ...arr.slice(idx + 1)];
      updated = true;
    }

    return updated ? new ParentEntity(this.parentId, { ...this._fields }, next) : this;
  }

  removeChild(childId: ChildId, childStepId: StepId): ParentEntity {
    const arr = this._childrenByStep[childStepId] ?? [];
    const filtered = arr.filter((c) => c.id !== childId);

    // Keep other steps unchanged
    return new ParentEntity(
      this.parentId,
      { ...this._fields },
      {
        ...this._childrenByStep,
        [childStepId]: filtered,
      }
    );
  }

  toRecord(): ParentRecord {
    return {
      ...this._fields,
      childrenData: Object.fromEntries(
        Object.entries(this._childrenByStep).map(([step, children]) => [
          step,
          children.map((c) => c.toJSON()),
        ])
      ),
    };
  }

  static fromRecord(parentId: ParentId, record?: ParentRecord): ParentEntity {
    const rec = record ?? {};
    const { childrenData = {}, ...fields } = rec;

    const normalizedChildren: Record<StepId, ChildEntity[]> = {};
    for (const [step, list] of Object.entries(childrenData)) {
      normalizedChildren[step] = (list ?? []).map((c) => ChildEntity.from(c));
    }

    return new ParentEntity(parentId, fields, normalizedChildren);
  }
}

/** ---------- Service (pure, testable) ---------- */

export class FormDataService {
  constructor(private readonly idFactory: () => string) {}

  private parentEntity(state: ParentFormData, parentId: ParentId): ParentEntity {
    return ParentEntity.fromRecord(parentId, state[parentId]);
  }

  listAllChildren(state: ParentFormData): ChildRecord[] {
    const out: ChildRecord[] = [];
    for (const [pid, rec] of Object.entries(state)) {
      const entity = ParentEntity.fromRecord(pid, rec);
      entity.getChildren().forEach((c) => out.push(c.toJSON()));
    }
    return out;
  }

  /** COMMANDS (all immutable) */
  createNewChild(
    state: ParentFormData,
    parentId: ParentId,
    stepId: StepId
  ): { next: ParentFormData; child: ChildRecord } {
    const child = new ChildEntity(this.idFactory(), parentId, stepId, {});
    const parent = this.parentEntity(state, parentId).addChild(child);
    return {
      next: { ...state, [parentId]: parent.toRecord() },
      child: child.toJSON(),
    };
  }

  editExistingChild(
    state: ParentFormData,
    parentId: ParentId,
    childId: ChildId
  ): ChildRecord | null {
    const parent = this.parentEntity(state, parentId);
    const found = parent.findChild(childId);
    return found ? found.toJSON() : null;
  }

  saveChildData(
    state: ParentFormData,
    parentId: ParentId,
    childId: ChildId,
    newData: Record<FieldId, any>
  ): ParentFormData {
    const parent = this.parentEntity(state, parentId).upsertChild(childId, newData);
    return { ...state, [parentId]: parent.toRecord() };
  }

  getChildById(
    state: ParentFormData,
    parentId: ParentId,
    childId: ChildId
  ): ChildRecord | null {
    const parent = this.parentEntity(state, parentId);
    const found = parent.findChild(childId);
    return found ? found.toJSON() : null;
  }

  updateChildById(
    state: ParentFormData,
    parentId: ParentId,
    childId: ChildId,
    newData: Record<FieldId, any>
  ): ParentFormData {
    return this.saveChildData(state, parentId, childId, newData);
  }

  deleteChild(
    state: ParentFormData,
    childId: ChildId,
    parentId: ParentId,
    childStepId: StepId
  ): ParentFormData {
    const parent = this.parentEntity(state, parentId).removeChild(childId, childStepId);
    return { ...state, [parentId]: parent.toRecord() };
  }

  getChildrenByParentId(state: ParentFormData, parentId: ParentId): ChildRecord[] {
    const parent = this.parentEntity(state, parentId);
    return parent.getChildren().map((c) => c.toJSON());
  }

  getChildrenByParentAndStep(
    state: ParentFormData,
    parentId: ParentId,
    stepId: StepId
  ): ChildRecord[] {
    const parent = this.parentEntity(state, parentId);
    return parent.getChildren(stepId).map((c) => c.toJSON());
  }

  clearParentData(state: ParentFormData, parentId: ParentId): ParentFormData {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [parentId]: _removed, ...rest } = state;
    return rest;
  }

  clearAllData(): ParentFormData {
    return {};
  }
}
