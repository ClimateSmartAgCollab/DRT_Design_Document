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
  constructor(private readonly presentation: AdcForm) {}

  parse(fields: Field[]): Page_parsed[] {
    const pres = this.presentation;

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
              sectionLabel: Lang.pick(pres.page_labels, grp.named_section),
              subheading: Lang.pick(pres.subheading, grp.named_section),
              fields: (grp.attribute_order ?? [])
                .map((fId) => fields.find((f) => f.id === fId))
                .filter(Boolean) as Field[],
            };
          })
          .filter(Boolean) as Section[];

        return {
          pageKey,
          pageLabel: Lang.pick(pres.page_labels, pageKey),
          sidebar_label: Lang.pick(pres.sidebar_label, pageKey),
          subheading: Lang.pick(pres.subheading, pageKey),
          sections,
          captureBase: pres.capture_base,
        } as Page_parsed;
      })
      .filter(Boolean) as Page_parsed[];
  }

  getPageInfo(pageKey: string): {
    page: any;
    pageLabel: Record<string, string>;
    sidebarLabel: Record<string, string>;
    subheading: Record<string, string>;
  } | null {
    const pres = this.presentation;
    const page = pres.pages?.find((p) => p.named_section === pageKey);
    if (!page) return null;

    return {
      page,
      pageLabel: Lang.pick(pres.page_labels, pageKey),
      sidebarLabel: Lang.pick(pres.sidebar_label, pageKey),
      subheading: Lang.pick(pres.subheading, pageKey),
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
            });
            presentations.push(...adcExt.overlays.form);
          }
        }
      );
    }

    // Fallback to old form structure if no ADC extensions found
    if (presentations.length === 0 && metadata.extensions?.form) {
      presentations = metadata.extensions.form as AdcForm[];
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

    // Main title
    let mainTitle: Record<string, string> = { eng: "", fra: "" };
    const mainPres = sortedPresentations.find(
      (p) => p.capture_base === mainCaptureBase
    );
    if (mainPres?.title) {
      mainTitle = {
        eng: typeof mainPres.title.eng === "string" ? mainPres.title.eng : "",
        fra: typeof mainPres.title.fra === "string" ? mainPres.title.fra : "",
      };
    }

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

