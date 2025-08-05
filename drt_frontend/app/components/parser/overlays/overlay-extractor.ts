import { Bundle, Dependency, AdcForm, ArgumentType } from '../../type';
import { OverlayData, StepMeta } from '../types/parser-types';
import { findBundleByCaptureBase, getInteractionArgs } from '../utils/entity-lookup';
import { safeArray, numberOr } from '../utils/helpers';


export const getOverlayData = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[],
  presentations: AdcForm[] | undefined,
): OverlayData => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies);
  
  if (!entity) {
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
  }

  const labels: Record<string, Record<string, string>> = {};
  const options: Record<string, Record<string, string[]>> = {};
  const optionLabels: Record<string, Record<string, Record<string, string>>> = {};
  const types: Record<string, ArgumentType> = {};
  const cardinalityRules: Record<string, { min: number; max: number }> = {};
  const conformance: Record<string, any> = {};
  const entryCodes: Record<string, string[] | undefined> = {};
  const characterEncoding: Record<string, any> = {};
  const format: Record<string, any> = {};

  // Extract label overlays
  safeArray(entity.overlays?.label).forEach((overlay) => {
    labels[overlay.language] = overlay.attribute_labels ?? {};
  });

  // Extract entry overlays
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

  // Extract cardinality rules
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

  // Extract interaction arguments
  const interaction = getInteractionArgs(captureBase, presentations);
  Object.keys(interaction).forEach((k) => {
    types[k] = interaction[k];
  });

  // Extract conformance rules
  if (entity.overlays?.conformance?.attribute_conformance) {
    Object.assign(conformance, entity.overlays.conformance.attribute_conformance);
  }

  // Extract entry codes
  if (entity.overlays?.entry_code?.attribute_entry_codes) {
    Object.assign(entryCodes, entity.overlays.entry_code.attribute_entry_codes);
  }

  // Extract character encoding rules
  if (entity.overlays?.character_encoding?.attribute_character_encoding) {
    Object.assign(
      characterEncoding,
      entity.overlays.character_encoding.attribute_character_encoding,
    );
  }

  // Extract format rules
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


export const getStepMeta = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[],
): StepMeta => {
  const entity = findBundleByCaptureBase(captureBase, bundle, dependencies);
  
  if (!entity) {
    return { names: {}, descriptions: {} };
  }
  
  const meta = safeArray(entity.overlays?.meta);
  const names: Record<string, string> = {};
  const descriptions: Record<string, string> = {};
  
  meta.forEach((m) => {
    names[m.language] = m.name ?? 'Unnamed Step';
    descriptions[m.language] = m.description ?? '';
  });
  
  return { names, descriptions };
};


export const getFieldType = (
  fieldId: string,
  types: Record<string, ArgumentType>,
  options: Record<string, Record<string, string[]>>,
): string => {
  const t = types[fieldId];
  const fType = t?.type ?? (options.eng?.[fieldId] ? 'enum' : 'textarea');
  return typeof fType === 'string' ? fType : 'textarea';
};


export const createFieldLabels = (
  fieldId: string,
  labels: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> => {
  let fieldLabels: Record<string, Record<string, string>> = { eng: { [fieldId]: '' } };
  
  if (Object.keys(labels).length > 0) {
    for (const lang in labels) {
      const langLabels = labels[lang];
      if (langLabels && typeof langLabels === 'object' && typeof langLabels[fieldId] === 'string') {
        fieldLabels[lang] = { [fieldId]: langLabels[fieldId] };
      }
    }
  }
  
  return fieldLabels;
};


export const createFieldOptions = (
  fieldId: string,
  options: Record<string, Record<string, string[]>>,
): Record<string, Record<string, string[]>> => {
  let fieldOptions: Record<string, Record<string, string[]>> = { eng: { [fieldId]: [] } };
  
  if (Object.keys(options).length > 0) {
    for (const lang in options) {
      const langOptions = options[lang];
      if (langOptions && typeof langOptions === 'object' && Array.isArray(langOptions[fieldId])) {
        fieldOptions[lang] = { [fieldId]: langOptions[fieldId] };
      }
    }
  }
  
  return fieldOptions;
};


export const createFieldOptionLabels = (
  fieldId: string,
  optionLabels: Record<string, Record<string, Record<string, string>>>,
): Record<string, Record<string, Record<string, string>>> => {
  let fieldOptionLabels: Record<string, Record<string, Record<string, string>>> = { 
    eng: { [fieldId]: {} } 
  };
  
  if (Object.keys(optionLabels).length > 0) {
    for (const lang in optionLabels) {
      const langOptionLabels = optionLabels[lang];
      if (langOptionLabels && typeof langOptionLabels === 'object' && langOptionLabels[fieldId]) {
        fieldOptionLabels[lang] = { [fieldId]: langOptionLabels[fieldId] };
      }
    }
  }
  
  return fieldOptionLabels;
}; 