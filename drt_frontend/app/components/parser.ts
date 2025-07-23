import {
  Root,
  Bundle,
  Dependency,
  AdcForm,
  AttributeGroup,
  LangMap,
  Field,
  Page_parsed,
  Step,
  ArgumentType,
  Section,
} from '../components/type';

import metadataJson from '../../public/test2.json';

// Utility functions
const asRoot = (json: unknown): Root => json as Root;
const safeArray = <T>(val: T[] | undefined | null): T[] => (Array.isArray(val) ? val : []);
const langPick = (obj: Record<string, Record<string, string>> | undefined, key: string): Record<string, string> => {
  const res: Record<string, string> = {};
  if (!obj) return res;
  Object.keys(obj).forEach((lang) => {
    res[lang] = obj[lang]?.[key] ?? '';
  });
  return res;
};
const numberOr = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Normalize entry codes in dependencies
const normalizeEntryCodes = (dependencies: Dependency[]): void => {
  dependencies.forEach((dep) => {
    const codes = dep.overlays?.entry_code?.attribute_entry_codes;
    if (codes) {
      dep.overlays!.entry_code!.attribute_entry_codes = Object.fromEntries(
        Object.entries(codes).map(([k, v]) => [k, v ?? []]),
      );
    }
  });
};

// Find bundle or dependency by capture base
const findBundleByCaptureBase = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[],
): Bundle | Dependency | null => {
  if (bundle.capture_base.d === captureBase) return bundle;
  const depByCap = dependencies.find((dep) => dep.capture_base.d === captureBase);
  if (depByCap) return depByCap;
  const depByD = dependencies.find((dep) => dep.d === captureBase);
  return depByD ?? null;
};

// Get interaction arguments for a capture base
const getInteractionArgs = (
  captureBase: string,
  presentations: AdcForm[] | undefined,
): Record<string, ArgumentType> => {
  if (!presentations) return {};
  return (
    presentations.find((p) => p.capture_base === captureBase)?.interaction?.[0]?.arguments ?? {}
  );
};

// Relationship map type
type RelationshipMap = Record<
  string,
  {
    id: string;
    isParent: boolean;
    parent: string | null;
    children: string[];
    fields: string[];
    refsMap: Record<string, string>;
  }
>;

// Parse relationships for a presentation
const parseRelationships = (
  bundle: Bundle,
  dependencies: Dependency[],
  presentation: AdcForm,
): RelationshipMap => {
  const relationships: RelationshipMap = {};
  const visited = new Set<string>();
  const traverse = (capBase: string, parent: string | null) => {
    if (visited.has(capBase)) return;
    visited.add(capBase);
    const entity = findBundleByCaptureBase(capBase, bundle, dependencies);
    if (!entity) {
      console.warn(`Entity not found for capture_base: ${capBase}`);
      return;
    }
    const childRefs: string[] = [];
    const refsMap: Record<string, string> = {};
    Object.entries(entity.capture_base.attributes ?? {}).forEach(([attrKey, attrVal]) => {
      if (typeof attrVal === 'string' && attrVal.startsWith('refs:')) {
        const refId = attrVal.replace('refs:', '');
        const refEntity = dependencies.find((dep) => dep.d === refId);
        if (refEntity) {
          childRefs.push(refEntity.capture_base.d);
          refsMap[attrKey] = refEntity.capture_base.d;
        }
      }
    });
    relationships[capBase] = {
      id: capBase,
      isParent: childRefs.length > 0,
      parent,
      children: childRefs,
      fields: Object.keys(entity.capture_base.attributes ?? {}),
      refsMap,
    };
    childRefs.forEach((child) => traverse(child, capBase));
  };
  traverse(presentation.capture_base, null);
  return relationships;
};

// Overlay data extraction
interface OverlayData {
  labels: LangMap<Record<string, string>>;
  options: LangMap<Record<string, string[]>>;
  optionLabels: LangMap<Record<string, Record<string, string>>>;
  types: Record<string, ArgumentType>;
  cardinalityRules: Record<string, { min: number; max: number }>;
  conformance: Record<string, any>;
  entryCodes: Record<string, string[] | undefined>;
  characterEncoding: Record<string, any>;
  format: Record<string, any>;
}

const getOverlayData = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[],
  presentations: AdcForm[] | undefined,
): OverlayData => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies);
  if (!entity)
    return {
      labels: {},
      options: {},
      optionLabels: {},
      types: {},
      cardinalityRules: {},
      conformance: {},
      entryCodes: {},
      characterEncoding: {},
      format: {},
    };
  const labels: LangMap<Record<string, string>> = {};
  const options: LangMap<Record<string, string[]>> = {};
  const optionLabels: LangMap<Record<string, Record<string, string>>> = {};
  const types: Record<string, ArgumentType> = {};
  const cardinalityRules: Record<string, { min: number; max: number }> = {};
  const conformance: Record<string, any> = {};
  const entryCodes: Record<string, string[] | undefined> = {};
  const characterEncoding: Record<string, any> = {};
  const format: Record<string, any> = {};
  safeArray(entity.overlays?.label).forEach((overlay) => {
    labels[overlay.language] = overlay.attribute_labels ?? {};
  });
  safeArray(entity.overlays?.entry).forEach((overlay) => {
    options[overlay.language] = overlay.attribute_entries
      ? Object.fromEntries(
          Object.entries(overlay.attribute_entries).map(([k, v]) => [
            k,
            Array.isArray(v) ? v : Object.keys(v),
          ]),
        )
      : {};
    optionLabels[overlay.language] = overlay.attribute_entries ?? {};
  });
  if (entity.overlays?.cardinality) {
    const card = entity.overlays.cardinality.attribute_cardinality ?? {};
    Object.entries(card).forEach(([field, range]) => {
      const [minS, maxS] = String(range).split('-');
      cardinalityRules[field] = {
        min: numberOr(minS, 0),
        max: numberOr(maxS, Number.MAX_SAFE_INTEGER),
      };
    });
  }
  const interaction = getInteractionArgs(captureBase, presentations);
  Object.keys(interaction).forEach((k) => {
    types[k] = interaction[k];
  });
  if (entity.overlays?.conformance?.attribute_conformance) {
    Object.assign(conformance, entity.overlays.conformance.attribute_conformance);
  }
  if (entity.overlays?.entry_code?.attribute_entry_codes) {
    Object.assign(entryCodes, entity.overlays.entry_code.attribute_entry_codes);
  }
  if (entity.overlays?.character_encoding?.attribute_character_encoding) {
    Object.assign(
      characterEncoding,
      entity.overlays.character_encoding.attribute_character_encoding,
    );
  }
  if (entity.overlays?.format?.attribute_formats) {
    Object.assign(format, entity.overlays.format.attribute_formats);
  }
  return {
    labels,
    options,
    optionLabels,
    types,
    cardinalityRules,
    conformance,
    entryCodes,
    characterEncoding,
    format,
  };
};

// Step meta extraction
const getStepMeta = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[],
): { names: Record<string, string>; descriptions: Record<string, string> } => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies);
  if (!entity) return { names: {}, descriptions: {} };
  const meta = safeArray(entity.overlays?.meta);
  const names: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  meta.forEach((m) => {
    names[m.language] = m.name ?? 'Unnamed Step';
    descriptions[m.language] = m.description ?? '';
  });
  return { names, descriptions };
};

// Parse a presentation into Page_parsed[]
const parsePresentation = (
  presentation: AdcForm,
  labels: LangMap<Record<string, string>>,
  fields: Field[],
): Page_parsed[] => {
  return presentation.page_order
    .map((pageKey) => {
      const page = presentation.pages.find((p) => p.named_section === pageKey);
      if (!page) return null;
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

// Main public function
export const parseJsonToFormStructure = (): Step[] => {
  const metadata = asRoot(metadataJson);
  normalizeEntryCodes(metadata.oca_bundle.dependencies);
  const { bundle, dependencies } = metadata.oca_bundle;
  
  // Handle both old and new extension structures
  let presentations: AdcForm[] = [];
  
  // Check for new ADC extension structure first
  if (metadata.extensions?.adc) {
    const adcExtensions = metadata.extensions.adc;
    // Flatten all forms from all ADC extensions
    Object.entries(adcExtensions).forEach(([captureBaseId, adcExt]) => {
      if (adcExt.overlays?.form) {
        // Set the capture_base property for each form based on the key
        adcExt.overlays.form.forEach((form) => {
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
  
  if (!presentations.length) {
    console.warn('No presentations found in the OCA package.');
    return [];
  }
  
  const mainCaptureBase = bundle.capture_base.d;
  const sortedPresentations = [...presentations].sort((a, b) => {
    if (a.capture_base === mainCaptureBase && b.capture_base !== mainCaptureBase) return -1;
    if (b.capture_base === mainCaptureBase && a.capture_base !== mainCaptureBase) return 1;
    return 0;
  });
  
  let mainTitle: Record<string, string> = { eng: '', fra: '' };
  const mainPres = sortedPresentations.find((p) => p.capture_base === mainCaptureBase);
  if (mainPres?.title) {
    mainTitle = {
      eng: typeof mainPres.title.eng === 'string' ? mainPres.title.eng : '',
      fra: typeof mainPres.title.fra === 'string' ? mainPres.title.fra : '',
    };
  }
  
  const allSteps: Record<string, Step> = {};
  sortedPresentations.forEach((presentation) => {
    const relationships = parseRelationships(bundle, dependencies, presentation);
    Object.entries(relationships).forEach(([capBase, rel]) => {
      const {
        labels,
        options,
        optionLabels,
        types,
        cardinalityRules,
        conformance,
        entryCodes,
        characterEncoding,
        format,
      } = getOverlayData(capBase, bundle, dependencies, presentations);
      const { names, descriptions } = getStepMeta(capBase, bundle, dependencies);
      const fieldIds = Object.keys(labels.eng ?? {});
      const fields: Field[] = fieldIds.map((fieldId) => {
        let fieldLabels: LangMap<LangMap<string>> = { eng: { [fieldId]: '' } };
        if (Object.keys(labels).length > 0) {
          for (const lang in labels) {
            const langLabels = labels[lang];
            if (langLabels && typeof langLabels === 'object' && typeof langLabels[fieldId] === 'string') {
              fieldLabels[lang] = { [fieldId]: langLabels[fieldId] };
            }
          }
        }
        let fieldOptions: LangMap<LangMap<string[]>> = { eng: { [fieldId]: [] } };
        if (Object.keys(options).length > 0) {
          for (const lang in options) {
            const langOptions = options[lang];
            if (langOptions && typeof langOptions === 'object' && Array.isArray(langOptions[fieldId])) {
              fieldOptions[lang] = { [fieldId]: langOptions[fieldId] };
            }
          }
        }
        let fieldOptionLabels: LangMap<LangMap<Record<string, string>>> = { eng: { [fieldId]: {} } };
        if (Object.keys(optionLabels).length > 0) {
          for (const lang in optionLabels) {
            const langOptionLabels = optionLabels[lang];
            if (langOptionLabels && typeof langOptionLabels === 'object' && langOptionLabels[fieldId]) {
              fieldOptionLabels[lang] = { [fieldId]: langOptionLabels[fieldId] };
            }
          }
        }
        const t = types[fieldId];
        const fType =
          t?.type ??
          (options.eng?.[fieldId] ? 'enum' : 'textarea');
        const fld: Field = {
          id: fieldId,
          labels: fieldLabels,
          options: fieldOptions,
          optionLabels: fieldOptionLabels,
          type: typeof fType === 'string' ? fType : 'textarea',
          orientation: (t?.orientation as 'vertical' | 'horizontal') ?? undefined,
          value: t?.value,
          ref: undefined,
          placeholder: t?.placeholder,
          validation: {
            conformance: conformance[fieldId],
            entryCodes: entryCodes[fieldId],
            characterEncoding: characterEncoding[fieldId],
            format: format[fieldId],
            cardinality: cardinalityRules[fieldId],
          },
        };
        // Safely assign optional properties if they exist
        if (
          t &&
          typeof t === 'object' &&
          'reference_button_text' in t &&
          typeof t.reference_button_text === 'object' &&
          t.reference_button_text !== null
        ) {
          fld.reference_button_text = t.reference_button_text as Record<string, string>;
        }
        if (
          t &&
          typeof t === 'object' &&
          'showing_attribute' in t &&
          Array.isArray(t.showing_attribute)
        ) {
          fld.showing_attribute = t.showing_attribute as string[];
        }
        if (fld.type === 'reference') {
          const refMap = relationships[capBase].refsMap;
          if (refMap && refMap[fieldId]) {
            fld.ref = refMap[fieldId];
          }
        }
        return fld;
      });
      const pages = parsePresentation(presentation, labels, fields);
      if (!allSteps[capBase]) {
        allSteps[capBase] = {
          id: capBase,
          title: capBase === mainCaptureBase ? mainTitle : undefined,
          names,
          descriptions,
          parent: rel.parent,
          pages,
        };
      } else {
        const existingPages = new Set(allSteps[capBase].pages.map((p) => p.pageKey));
        const newOnes = pages.filter((p) => !existingPages.has(p.pageKey));
        allSteps[capBase].pages.push(...newOnes);
      }
    });
  });
  return Object.values(allSteps);
};
