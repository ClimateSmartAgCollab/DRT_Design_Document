import { Bundle, Dependency, AdcForm, ArgumentType } from "../../type";
import { OverlayData, StepMeta } from "../types/parser-types";
import { EntityLocator, DefaultEntityLocator } from "../utils/entity-lookup";
import { Arrays, Numbers } from "../utils/helpers";


export class OverlaySnapshot {
  constructor(
    private readonly data: OverlayData,
    private readonly defaultLang: string = "eng"
  ) {}

  toDTO(): OverlayData {
    return this.data;
  }

  getFieldType(fieldId: string): string {
    const { types, options } = this.data;
    const t = types[fieldId];
    const inferred =
      t?.type ?? (options?.[this.defaultLang]?.[fieldId] ? "enum" : "textarea");
    return typeof inferred === "string" ? inferred : "textarea";
  }

  labelsFor(fieldId: string): Record<string, Record<string, string>> {
    const out: Record<string, Record<string, string>> = {
      [this.defaultLang]: { [fieldId]: "" },
    };
    for (const lang of Object.keys(this.data.labels ?? {})) {
      const byLang = this.data.labels[lang];
      if (byLang && typeof byLang[fieldId] === "string") {
        out[lang] = { [fieldId]: byLang[fieldId] };
      }
    }
    return out;
  }

  optionsFor(fieldId: string): Record<string, Record<string, string[]>> {
    const out: Record<string, Record<string, string[]>> = {
      [this.defaultLang]: { [fieldId]: [] },
    };
    for (const lang of Object.keys(this.data.options ?? {})) {
      const byLang = this.data.options[lang];
      if (byLang && Array.isArray(byLang[fieldId])) {
        out[lang] = { [fieldId]: byLang[fieldId] };
      }
    }
    return out;
  }

  optionLabelsFor(
    fieldId: string
  ): Record<string, Record<string, Record<string, string>>> {
    const out: Record<string, Record<string, Record<string, string>>> = {
      [this.defaultLang]: { [fieldId]: {} },
    };
    for (const lang of Object.keys(this.data.optionLabels ?? {})) {
      const byLang = this.data.optionLabels[lang];
      if (byLang && byLang[fieldId]) {
        out[lang] = { [fieldId]: byLang[fieldId] };
      }
    }
    return out;
  }
}

export class OverlayExtractor {
  constructor(
    private readonly bundle: Bundle,
    private readonly dependencies: Dependency[],
    private readonly presentations?: AdcForm[],
    private readonly locator: EntityLocator = DefaultEntityLocator,
    private readonly defaultLang: string = "eng"
  ) {}

  extract(captureBase: string): OverlaySnapshot {
    const entity = this.locator.findByCaptureBase(
      captureBase,
      this.bundle,
      this.dependencies
    );

    if (!entity) {
      return new OverlaySnapshot(
        {
          labels: {},
          options: {},
          optionLabels: {},
          types: {},
          cardinalityRules: {},
          conformance: {},
          entryCodes: {},
          characterEncoding: {},
          format: {},
        },
        this.defaultLang
      );
    }

    const labels: Record<string, Record<string, string>> = {};
    const options: Record<string, Record<string, string[]>> = {};
    const optionLabels: Record<
      string,
      Record<string, Record<string, string>>
    > = {};
    const types: Record<string, ArgumentType> = {};
    const cardinalityRules: Record<string, { min: number; max: number }> = {};
    const conformance: Record<string, any> = {};
    const entryCodes: Record<string, string[] | undefined> = {};
    const characterEncoding: Record<string, any> = {};
    const format: Record<string, any> = {};

    Arrays.safe(entity.overlays?.label).forEach((overlay: any) => {
      labels[overlay.language] = overlay.attribute_labels ?? {};
    });

    Arrays.safe(entity.overlays?.entry).forEach((overlay: any) => {
      options[overlay.language] = overlay.attribute_entries
        ? Object.fromEntries(
            Object.entries(overlay.attribute_entries).map(([k, v]) => [
              k,
              Array.isArray(v) ? v : Object.keys(v as object),
            ])
          )
        : {};
      optionLabels[overlay.language] = overlay.attribute_entries ?? {};
    });

    if (entity.overlays?.cardinality) {
      const card = entity.overlays.cardinality.attribute_cardinality ?? {};
      Object.entries(card).forEach(([field, range]) => {
        const [minS, maxS] = String(range).split("-");
        cardinalityRules[field] = {
          min: Numbers.or(minS, 0),
          max: Numbers.or(maxS, Number.MAX_SAFE_INTEGER),
        };
      });
    }

    const interaction = this.locator.getInteractionArgs(
      captureBase,
      this.presentations
    );
    Object.keys(interaction).forEach((k) => {
      types[k] = interaction[k];
    });

    if (entity.overlays?.conformance?.attribute_conformance) {
      Object.assign(
        conformance,
        entity.overlays.conformance.attribute_conformance
      );
    }

    if (entity.overlays?.entry_code?.attribute_entry_codes) {
      Object.assign(
        entryCodes,
        entity.overlays.entry_code.attribute_entry_codes
      );
    }

    if (entity.overlays?.character_encoding?.attribute_character_encoding) {
      Object.assign(
        characterEncoding,
        entity.overlays.character_encoding.attribute_character_encoding
      );
    }

    if (entity.overlays?.format?.attribute_formats) {
      Object.assign(format, entity.overlays.format.attribute_formats);
    }

    return new OverlaySnapshot(
      {
        labels,
        options,
        optionLabels,
        types,
        cardinalityRules,
        conformance,
        entryCodes,
        characterEncoding,
        format,
      },
      this.defaultLang
    );
  }

  extractStepMeta(captureBase: string): StepMeta {
    const entity = this.locator.findByCaptureBase(
      captureBase,
      this.bundle,
      this.dependencies
    );

    if (!entity) return { names: {}, descriptions: {} };

    const meta = Arrays.safe(entity.overlays?.meta);
    const names: Record<string, string> = {};
    const descriptions: Record<string, string> = {};

    meta.forEach((m: any) => {
      names[m.language] = m.name ?? "Unnamed Step";
      descriptions[m.language] = m.description ?? "";
    });

    return { names, descriptions };
  }
}