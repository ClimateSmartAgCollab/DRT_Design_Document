/**
 * Presentation parsing utilities for ADC forms
 * @module parsers/presentation-parser
 */

import { AdcForm, AttributeGroup, Field, Page_parsed, Section } from '../../type';
import { langPick } from '../utils/helpers';

/**
 * Parses a presentation into an array of pages
 * @param presentation - The ADC form presentation to parse
 * @param labels - Language-specific labels
 * @param fields - Array of fields to include in pages
 * @returns Array of parsed pages
 */
export const parsePresentation = (
  presentation: AdcForm,
  labels: Record<string, Record<string, string>>,
  fields: Field[],
): Page_parsed[] => {
  return presentation.page_order
    .map((pageKey) => {
      const page = presentation.pages.find((p) => p.named_section === pageKey);
      if (!page) {
        return null;
      }

      const sections = page.attribute_order
        .map((sectionOrField) => {
          if (typeof sectionOrField === 'string') {
            return {
              sectionKey: sectionOrField,
              sectionLabel: {},
              fields: fields.filter((f) => f.id === sectionOrField),
            };
          }

          const grp = sectionOrField as AttributeGroup;
          return {
            sectionKey: grp.named_section,
            sectionLabel: langPick(presentation.page_labels, grp.named_section),
            subheading: langPick(presentation.subheading, grp.named_section),
            fields: grp.attribute_order
              .map((fId) => fields.find((f) => f.id === fId))
              .filter(Boolean) as Field[],
          };
        })
        .filter(Boolean) as Section[];

      return {
        pageKey,
        pageLabel: langPick(presentation.page_labels, pageKey),
        sidebar_label: langPick(presentation.sidebar_label, pageKey),
        subheading: langPick(presentation.subheading, pageKey),
        sections,
        captureBase: presentation.capture_base,
      } as Page_parsed;
    })
    .filter(Boolean) as Page_parsed[];
};

/**
 * Extracts presentations from metadata with support for both old and new structures
 * @param metadata - The root metadata object
 * @returns Object containing presentations, main capture base, and main title
 */
export const extractPresentations = (metadata: any): {
  presentations: AdcForm[];
  mainCaptureBase: string;
  mainTitle: Record<string, string>;
} => {
  let presentations: AdcForm[] = [];
  const mainCaptureBase = metadata.oca_bundle.bundle.capture_base.d;

  // Check for new ADC extension structure first
  if (metadata.extensions?.adc) {
    const adcExtensions = metadata.extensions.adc;
    // Flatten all forms from all ADC extensions
    Object.entries(adcExtensions).forEach(([captureBaseId, adcExt]: [string, any]) => {
      if (adcExt.overlays?.form) {
        // Set the capture_base property for each form based on the key
        adcExt.overlays.form.forEach((form: AdcForm) => {
          form.capture_base = captureBaseId;
        });
        presentations.push(...adcExt.overlays.form);
      }
    });
  }

  // Fallback to old form structure if no ADC extensions found
  if (presentations.length === 0 && metadata.extensions?.form) {
    presentations = metadata.extensions.form as AdcForm[];
  }

  // Sort presentations to put main capture base first
  const sortedPresentations = [...presentations].sort((a, b) => {
    if (a.capture_base === mainCaptureBase && b.capture_base !== mainCaptureBase) {
      return -1;
    }
    if (b.capture_base === mainCaptureBase && a.capture_base !== mainCaptureBase) {
      return 1;
    }
    return 0;
  });

  // Extract main title
  let mainTitle: Record<string, string> = { eng: '', fra: '' };
  const mainPres = sortedPresentations.find((p) => p.capture_base === mainCaptureBase);
  if (mainPres?.title) {
    mainTitle = {
      eng: typeof mainPres.title.eng === 'string' ? mainPres.title.eng : '',
      fra: typeof mainPres.title.fra === 'string' ? mainPres.title.fra : '',
    };
  }

  return {
    presentations: sortedPresentations,
    mainCaptureBase,
    mainTitle,
  };
};

/**
 * Validates if a presentation has the required structure
 * @param presentation - The presentation to validate
 * @returns True if valid, false otherwise
 */
export const validatePresentation = (presentation: AdcForm): boolean => {
  if (!presentation.capture_base) {
    return false;
  }

  if (!presentation.page_order || !Array.isArray(presentation.page_order)) {
    return false;
  }

  if (!presentation.pages || !Array.isArray(presentation.pages)) {
    return false;
  }

  return true;
};

/**
 * Gets all unique field IDs from a presentation
 * @param presentation - The presentation to extract field IDs from
 * @returns Array of unique field identifiers
 */
export const getPresentationFieldIds = (presentation: AdcForm): string[] => {
  const fieldIds = new Set<string>();

  presentation.pages.forEach((page) => {
    page.attribute_order.forEach((sectionOrField) => {
      if (typeof sectionOrField === 'string') {
        fieldIds.add(sectionOrField);
      } else {
        const grp = sectionOrField as AttributeGroup;
        grp.attribute_order.forEach((fieldId) => {
          fieldIds.add(fieldId);
        });
      }
    });
  });

  return Array.from(fieldIds);
};

/**
 * Gets page information for a specific page key
 * @param presentation - The presentation to search in
 * @param pageKey - The page key to find
 * @returns Page information or null if not found
 */
export const getPageInfo = (
  presentation: AdcForm,
  pageKey: string,
): {
  page: any;
  pageLabel: Record<string, string>;
  sidebarLabel: Record<string, string>;
  subheading: Record<string, string>;
} | null => {
  const page = presentation.pages.find((p) => p.named_section === pageKey);
  if (!page) {
    return null;
  }

  return {
    page,
    pageLabel: langPick(presentation.page_labels, pageKey),
    sidebarLabel: langPick(presentation.sidebar_label, pageKey),
    subheading: langPick(presentation.subheading, pageKey),
  };
}; 