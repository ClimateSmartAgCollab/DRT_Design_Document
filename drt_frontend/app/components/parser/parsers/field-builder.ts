import { Field, ArgumentType } from "../../type";
import { OverlayData } from "../types/parser-types";
import { OverlaySnapshot } from "../overlays/overlay-extractor";

/** Creates Field objects from an OverlaySnapshot (pure, testable). */
export class FieldFactory {
  private readonly dto = this.snapshot.toDTO();
  private readonly types = this.dto.types ?? {};
  private readonly conformance = this.dto.conformance ?? {};
  private readonly entryCodes = this.dto.entryCodes ?? {};
  private readonly characterEncoding = this.dto.characterEncoding ?? {};
  private readonly format = this.dto.format ?? {};
  private readonly cardinalityRules = this.dto.cardinalityRules ?? {};
  private readonly descriptions = this.dto.descriptions ?? {};

  constructor(
    private readonly snapshot: OverlaySnapshot,
    private readonly refsMap: Record<string, string> = {}
  ) {}

  build(fieldId: string): Field {
    const typeInfo = this.types[fieldId];
    const fieldType = this.snapshot.getFieldType(fieldId);
    const fieldLabels = this.snapshot.labelsFor(fieldId);
    const fieldOptions = this.snapshot.optionsFor(fieldId);
    const fieldOptionLabels = this.snapshot.optionLabelsFor(fieldId);

    const field: Field = {
      id: fieldId,
      labels: fieldLabels,
      options: fieldOptions,
      optionLabels: fieldOptionLabels,
      type: fieldType,
      orientation:
        (typeInfo?.orientation as "vertical" | "horizontal") ?? undefined,
      value: typeInfo?.value,
      ref: undefined,
      placeholder: typeInfo?.placeholder,
      description: this.descriptions[fieldId],
      inputType: typeInfo?.input_type,
      booleanOptions: Array.isArray(typeInfo?.options) ? typeInfo.options : undefined,
      validation: {
        conformance: this.conformance[fieldId],
        entryCodes: this.entryCodes[fieldId],
        characterEncoding: this.characterEncoding[fieldId],
        format: this.format[fieldId],
        cardinality: this.cardinalityRules[fieldId],
      },
    };

    this.applyOptionalProps(field, typeInfo, fieldId);
    return field;
  }
  buildMany(fieldIds: string[]): Field[] {
    return fieldIds.map((id) => this.build(id));
  }

  private applyOptionalProps(
    field: Field,
    typeInfo: ArgumentType | undefined,
    fieldId: string
  ): void {
    if (!typeInfo || typeof typeInfo !== "object") return;

    if (
      "reference_button_text" in typeInfo &&
      typeof (typeInfo as any).reference_button_text === "object" &&
      (typeInfo as any).reference_button_text !== null
    ) {
      field.reference_button_text = (typeInfo as any)
        .reference_button_text as Record<string, string>;
    }

    if (
      "showing_attribute" in typeInfo &&
      Array.isArray((typeInfo as any).showing_attribute)
    ) {
      field.showing_attribute = (typeInfo as any).showing_attribute as string[];
    }

    if (field.type === "reference" && this.refsMap && this.refsMap[fieldId]) {
      field.ref = this.refsMap[fieldId];
    }
  }
}


export class FieldValidator {
  static isValid(field: Field): boolean {
    if (!field?.id || typeof field.id !== 'string') return false;
    if (!field?.type || typeof field.type !== 'string') return false;
    if (!field?.labels || typeof field.labels !== 'object') return false;
    if (!field?.validation || typeof field.validation !== 'object') return false;
    return true;
  }

  static isReference(field: Field): boolean {
    return field.type === 'reference' && field.ref !== undefined;
  }

  static referencesOf(fields: Field[]): Field[] {
    return fields.filter((f) => this.isReference(f));
  }
}

export class FieldDefaults {
  static create(fieldId: string, fieldType: string = 'textarea'): Field {
    return {
      id: fieldId,
      labels: { eng: { [fieldId]: '' } },
      options: { eng: { [fieldId]: [] } },
      optionLabels: { eng: { [fieldId]: {} } },
      type: fieldType,
      validation: {
        conformance: undefined,
        entryCodes: undefined,
        characterEncoding: undefined,
        format: undefined,
        cardinality: undefined,
      },
    };
  }
}