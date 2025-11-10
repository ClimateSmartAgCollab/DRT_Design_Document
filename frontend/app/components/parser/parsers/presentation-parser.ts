// drt_frontend/app/components/parser/parsers/presentation-parser.ts
import {
  AdcForm,
  AttributeGroup,
  Field,
  Page_parsed,
  Section,
} from "../../type";
import { Lang } from "../utils/helpers";

export class PresentationParser {
  constructor(
    private readonly presentation: AdcForm,
    private readonly allLanguagePresentations?: AdcForm[]
  ) {}

  parse(fields: Field[]): Page_parsed[] {
    const pres = this.presentation;
    const presLang = this.getLanguage();

    return (pres.page_order ?? [])
      .map((pageKey) => {
        const page = pres.pages?.find((p) => p.named_section === pageKey);
        if (!page) return null;

        const sections = (page.attribute_order ?? [])
          .map((sectionOrField) => {
            if (typeof sectionOrField === "string") {
              return {
                sectionKey: sectionOrField,
                sectionLabel: {},
                fields: fields.filter((f) => f.id === sectionOrField),
              };
            }

            const grp = sectionOrField as AttributeGroup;
            return {
              sectionKey: grp.named_section,
              sectionLabel: this.pickLabel('page_labels', grp.named_section, presLang),
              subheading: this.pickLabel('description', grp.named_section, presLang),
              fields: (grp.attribute_order ?? [])
                .map((fId) => fields.find((f) => f.id === fId))
                .filter(Boolean) as Field[],
            };
          })
          .filter(Boolean) as Section[];

        return {
          pageKey,
          pageLabel: this.pickLabel('page_labels', pageKey, presLang),
          sidebar_label: this.pickLabel('sidebar_label', pageKey, presLang),
          subheading: this.pickLabel('description', pageKey, presLang),
          sections,
          captureBase: pres.capture_base,
        } as Page_parsed;
      })
      .filter(Boolean) as Page_parsed[];
  }

  private getLanguage(): string {
    return Lang.normalize(this.presentation.language);
  }

  private pickLabel(
    fieldName: 'page_labels' | 'sidebar_label' | 'description',
    key: string,
    currentLang: string
  ): Record<string, string> {
    const obj = this.getFieldValue(this.presentation, fieldName);
    if (!obj) return {};

    const firstKey = Object.keys(obj)[0];
    if (firstKey && typeof obj[firstKey] === 'object' && obj[firstKey] !== null && !Array.isArray(obj[firstKey])) {
      return Lang.pick(obj, key);
    }

    const result: Record<string, string> = {};
    
    if (this.allLanguagePresentations && this.allLanguagePresentations.length > 0) {
      this.allLanguagePresentations.forEach((pres) => {
        const lang = Lang.normalize(pres.language);
        const presObj = this.getFieldValue(pres, fieldName);
        
        if (presObj && presObj[key] !== undefined) {
          result[lang] = presObj[key];
        }
      });
    } else {
      const value = obj[key];
      if (value !== undefined) {
        result[currentLang] = value;
      }
    }

    return result;
  }

  private getFieldValue(pres: AdcForm, fieldName: 'page_labels' | 'sidebar_label' | 'description'): any {
    if (fieldName === 'page_labels') return pres.page_labels;
    if (fieldName === 'sidebar_label') return pres.sidebar_label;
    if (fieldName === 'description') return pres.description || pres.subheading;
    return undefined;
  }

  getPageInfo(pageKey: string): {
    page: any;
    pageLabel: Record<string, string>;
    sidebarLabel: Record<string, string>;
    subheading: Record<string, string>;
  } | null {
    const pres = this.presentation;
    const presLang = this.getLanguage();
    const page = pres.pages?.find((p) => p.named_section === pageKey);
    if (!page) return null;

    return {
      page,
      pageLabel: this.pickLabel('page_labels', pageKey, presLang),
      sidebarLabel: this.pickLabel('sidebar_label', pageKey, presLang),
      subheading: this.pickLabel('description', pageKey, presLang),
    };
  }

  getFieldIds(): string[] {
    const ids = new Set<string>();
    (this.presentation.pages ?? []).forEach((page) => {
      (page.attribute_order ?? []).forEach((sectionOrField) => {
        if (typeof sectionOrField === "string") {
          ids.add(sectionOrField);
        } else {
          const grp = sectionOrField as AttributeGroup;
          (grp.attribute_order ?? []).forEach((id) => ids.add(id));
        }
      });
    });
    return Array.from(ids);
  }
}

/** Extractor for (possibly multiple) presentations embedded in root metadata. */
export class PresentationsExtractor {
  static extract(metadata: any): {
    presentations: AdcForm[];
    mainCaptureBase: string;
    mainTitle: Record<string, string>;
  } {
    let presentations: AdcForm[] = [];
    const mainCaptureBase = metadata.oca_bundle.bundle.capture_base.d;

    // Prefer new ADC extension structure
    if (metadata.extensions?.adc) {
      const adcExtensions = metadata.extensions.adc;
      Object.entries(adcExtensions).forEach(
        ([captureBaseId, adcExt]: [string, any]) => {
          if (adcExt.overlays?.form) {
            adcExt.overlays.form.forEach((form: AdcForm) => {
              form.capture_base = captureBaseId; // set from key
              if (!form.language) {
                form.language = 'eng';
              }
            });
            presentations.push(...adcExt.overlays.form);
          }
        }
      );
    }

    // Fallback to old form structure if no ADC extensions found
    if (presentations.length === 0 && metadata.extensions?.form) {
      presentations = metadata.extensions.form as AdcForm[];
      presentations.forEach(form => {
        if (!form.language) {
          form.language = 'eng';
        }
      });
    }

    // Put main capture base first
    const sortedPresentations = [...presentations].sort((a, b) => {
      if (
        a.capture_base === mainCaptureBase &&
        b.capture_base !== mainCaptureBase
      )
        return -1;
      if (
        b.capture_base === mainCaptureBase &&
        a.capture_base !== mainCaptureBase
      )
        return 1;
      return 0;
    });

    let mainTitle: Record<string, string> = { eng: "", fra: "" };
    
    sortedPresentations
      .filter((p) => p.capture_base === mainCaptureBase)
      .forEach((pres) => {
        if (pres.title) {
          if (typeof pres.title === "string") {
            const lang = Lang.normalize(pres.language);
            mainTitle[lang] = pres.title;
          } else if (typeof pres.title === "object") {
            mainTitle = {
              eng: typeof pres.title.eng === "string" ? pres.title.eng : mainTitle.eng,
              fra: typeof pres.title.fra === "string" ? pres.title.fra : mainTitle.fra,
            };
          }
        }
      });

    return { presentations: sortedPresentations, mainCaptureBase, mainTitle };
  }
}
export class PresentationValidator {
  static isValid(presentation: AdcForm): boolean {
    if (!presentation?.capture_base) return false;
    if (!Array.isArray(presentation?.page_order)) return false;
    if (!Array.isArray(presentation?.pages)) return false;
    return true;
  }
}

export class PresentationUtils {
  static fieldIds(presentation: AdcForm): string[] {
    return new PresentationParser(presentation).getFieldIds();
  }

  static pageInfo(
    presentation: AdcForm,
    pageKey: string,
  ): {
    page: any;
    pageLabel: Record<string, string>;
    sidebarLabel: Record<string, string>;
    subheading: Record<string, string>;
  } | null {
    return new PresentationParser(presentation).getPageInfo(pageKey);
  }
}

