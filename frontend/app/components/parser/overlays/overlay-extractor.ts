import { Bundle, Dependency, AdcForm, ArgumentType } from "../../type";
import { OverlayData, StepMeta } from "../types/parser-types";
import { EntityLocator, DefaultEntityLocator } from "../utils/entity-lookup";
import { Arrays, Numbers, Lang } from "../utils/helpers";


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
    return this.extractByLanguage(
      this.data.labels,
      fieldId,
      "",
      (value) => typeof value === "string"
    );
  }

  optionsFor(fieldId: string): Record<string, Record<string, string[]>> {
    return this.extractByLanguage(
      this.data.options,
      fieldId,
      [],
      (value) => Array.isArray(value)
    );
  }

  optionLabelsFor(fieldId: string): Record<string, Record<string, Record<string, string>>> {
    return this.extractByLanguage(
      this.data.optionLabels,
      fieldId,
      {},
      (value) => value !== undefined
    );
  }

  private extractByLanguage<T>(
    dataSource: Record<string, Record<string, T>> | undefined,
    fieldId: string,
    defaultValue: T,
    validator: (value: T) => boolean
  ): Record<string, Record<string, T>> {
    const out: Record<string, Record<string, T>> = {
      [this.defaultLang]: { [fieldId]: defaultValue },
    };
    
    for (const lang of Object.keys(dataSource ?? {})) {
      const byLang = dataSource?.[lang];
      const value = byLang?.[fieldId];
      if (value !== undefined && validator(value)) {
        out[lang] = { [fieldId]: value };
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
          descriptions: {},
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

    
    const allLanguages = this.getLanguagesForCaptureBase(captureBase);
    const fieldInteractionsByLang = this.collectInteractionsByLanguage(captureBase, allLanguages);
    
    
    Object.entries(fieldInteractionsByLang).forEach(([fieldId, langMap]) => {
      const baseArgs = (langMap[this.defaultLang] || Object.values(langMap)[0]) ?? {};
      const placeholders = this.extractPlaceholders(langMap, allLanguages);
      const referenceButtonText = this.extractReferenceButtonText(langMap, allLanguages);

      const out: ArgumentType = { ...baseArgs };
      if (Object.keys(placeholders).length > 0) {
        out.placeholder = placeholders;
      }
      if (Object.keys(referenceButtonText).length > 0) {
        out.reference_button_text = referenceButtonText;
      }
      types[fieldId] = out;
    });


    const knownFieldIds = new Set(Object.keys(entity.capture_base?.attributes || {}));
    const fieldDescriptions = this.extractFieldDescriptions(captureBase, knownFieldIds);

    Object.assign(conformance, entity.overlays?.conformance?.attribute_conformance ?? {});
    Object.assign(entryCodes, entity.overlays?.entry_code?.attribute_entry_codes ?? {});
    Object.assign(characterEncoding, entity.overlays?.character_encoding?.attribute_character_encoding ?? {});
    Object.assign(format, entity.overlays?.format?.attribute_formats ?? {});

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
        descriptions: fieldDescriptions,
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

  private getLanguagesForCaptureBase(captureBase: string): Set<string> {
    const languages = new Set<string>();
    if (this.presentations) {
      this.presentations
        .filter((p) => p.capture_base === captureBase)
        .forEach((p) => languages.add(Lang.normalize(p.language)));
    }
    return languages;
  }

  private collectInteractionsByLanguage(
    captureBase: string,
    languages: Set<string>
  ): Record<string, Record<string, ArgumentType>> {
    const fieldInteractionsByLang: Record<string, Record<string, ArgumentType>> = {};
    
    languages.forEach((lang) => {
      const interaction = this.locator.getInteractionArgs(captureBase, this.presentations, lang);
      Object.entries(interaction).forEach(([fieldId, args]) => {
        if (!fieldInteractionsByLang[fieldId]) {
          fieldInteractionsByLang[fieldId] = {};
        }
        fieldInteractionsByLang[fieldId][lang] = args;
      });
    });
    
    return fieldInteractionsByLang;
  }

  private extractPlaceholders(
    langMap: Record<string, ArgumentType>,
    languages: Set<string>
  ): Record<string, string> {
    const placeholders: Record<string, string> = {};
    
    languages.forEach((lang) => {
      const args = langMap[lang];
      if (!args?.placeholder) return;
      
      const placeholderValue: any = args.placeholder;
      const extractedValue = this.extractPlaceholderValue(placeholderValue, lang);
      
      if (extractedValue) {
        placeholders[lang] = extractedValue;
      }
    });
    
    return placeholders;
  }

  private extractReferenceButtonText(
    langMap: Record<string, ArgumentType>,
    languages: Set<string>
  ): Record<string, string> {
    const out: Record<string, string> = {};
    languages.forEach((lang) => {
      const args = langMap[lang] as any;
      if (!args?.reference_button_text) return;
      const v = args.reference_button_text;
      if (typeof v === "string") {
        const s = v.trim();
        if (s) out[lang] = s;
      } else if (
        typeof v === "object" &&
        v !== null &&
        !Array.isArray(v)
      ) {
        Object.entries(v).forEach(([k, val]) => {
          if (typeof val === "string" && val.trim()) out[k] = val.trim();
        });
      }
    });
    return out;
  }

  private extractPlaceholderValue(placeholderValue: any, lang: string): string | null {
    if (typeof placeholderValue === 'string') {
      const trimmed = placeholderValue.trim();
      return trimmed !== '' ? placeholderValue : null;
    }
    
    if (typeof placeholderValue === 'object' && placeholderValue[lang]) {
      const langValue = placeholderValue[lang];
      if (typeof langValue === 'string') {
        const trimmed = langValue.trim();
        return trimmed !== '' ? langValue : null;
      }
    }
    
    return null;
  }

  private extractFieldDescriptions(
    captureBase: string,
    knownFieldIds: Set<string>
  ): Record<string, Record<string, string>> {
    const fieldDescriptions: Record<string, Record<string, string>> = {};
    
    if (!this.presentations) return fieldDescriptions;
    
    this.presentations.forEach((pres) => {
      if (pres.capture_base !== captureBase || !pres.description) return;
      
      const lang = Lang.normalize(pres.language);
      
      Object.entries(pres.description).forEach(([key, value]) => {
        if (typeof value === 'string' && knownFieldIds.has(key)) {
          if (!fieldDescriptions[key]) {
            fieldDescriptions[key] = {};
          }
          fieldDescriptions[key][lang] = value;
        }
      });
    });
    
    return fieldDescriptions;
  }
}