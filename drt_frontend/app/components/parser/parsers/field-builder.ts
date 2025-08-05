import { Field, ArgumentType } from '../../type';
import { OverlayData } from '../types/parser-types';
import { 
  getFieldType, 
  createFieldLabels, 
  createFieldOptions, 
  createFieldOptionLabels 
} from '../overlays/overlay-extractor';

export const buildField = (
  fieldId: string,
  overlayData: OverlayData,
  refsMap: Record<string, string>,
): Field => {
  const {
    labels,
    options,
    optionLabels,
    types,
    conformance,
    entryCodes,
    characterEncoding,
    format,
    cardinalityRules,
  } = overlayData;

  const fieldLabels = createFieldLabels(fieldId, labels);
  const fieldOptions = createFieldOptions(fieldId, options);
  const fieldOptionLabels = createFieldOptionLabels(fieldId, optionLabels);
  const fieldType = getFieldType(fieldId, types, options);
  const typeInfo = types[fieldId];
  const field: Field = {
    id: fieldId,
    labels: fieldLabels,
    options: fieldOptions,
    optionLabels: fieldOptionLabels,
    type: fieldType,
    orientation: (typeInfo?.orientation as 'vertical' | 'horizontal') ?? undefined,
    value: typeInfo?.value,
    ref: undefined,
    placeholder: typeInfo?.placeholder,
    validation: {
      conformance: conformance[fieldId],
      entryCodes: entryCodes[fieldId],
      characterEncoding: characterEncoding[fieldId],
      format: format[fieldId],
      cardinality: cardinalityRules[fieldId],
    },
  };

  addOptionalFieldProperties(field, typeInfo, refsMap, fieldId);

  return field;
};


const addOptionalFieldProperties = (
  field: Field,
  typeInfo: ArgumentType | undefined,
  refsMap: Record<string, string>,
  fieldId: string,
): void => {
  if (!typeInfo || typeof typeInfo !== 'object') {
    return;
  }

  // Add reference button text if available
  if (
    'reference_button_text' in typeInfo &&
    typeof typeInfo.reference_button_text === 'object' &&
    typeInfo.reference_button_text !== null
  ) {
    field.reference_button_text = typeInfo.reference_button_text as Record<string, string>;
  }

  // Add showing attribute if available
  if (
    'showing_attribute' in typeInfo &&
    Array.isArray(typeInfo.showing_attribute)
  ) {
    field.showing_attribute = typeInfo.showing_attribute as string[];
  }

  // Set reference if field type is reference
  if (field.type === 'reference' && refsMap && refsMap[fieldId]) {
    field.ref = refsMap[fieldId];
  }
};


export const buildFields = (
  fieldIds: string[],
  overlayData: OverlayData,
  refsMap: Record<string, string>,
): Field[] => {
  return fieldIds.map((fieldId) => buildField(fieldId, overlayData, refsMap));
};


export const validateField = (field: Field): boolean => {
  if (!field.id || typeof field.id !== 'string') {
    return false;
  }

  if (!field.type || typeof field.type !== 'string') {
    return false;
  }

  if (!field.labels || typeof field.labels !== 'object') {
    return false;
  }

  if (!field.validation || typeof field.validation !== 'object') {
    return false;
  }

  return true;
};


export const getFieldTypeInfo = (
  fieldId: string,
  types: Record<string, ArgumentType>,
): ArgumentType | undefined => {
  return types[fieldId];
};


export const isReferenceField = (field: Field): boolean => {
  return field.type === 'reference' && field.ref !== undefined;
};


export const getReferenceFields = (fields: Field[]): Field[] => {
  return fields.filter(isReferenceField);
};


export const createDefaultField = (fieldId: string, fieldType: string = 'textarea'): Field => {
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
}; 