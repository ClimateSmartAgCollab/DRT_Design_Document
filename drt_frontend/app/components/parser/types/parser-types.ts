import { Bundle, Dependency, AdcForm, ArgumentType } from '../../type';


export interface RelationshipNode {
  id: string;
  isParent: boolean;
  parent: string | null;
  children: string[];
  fields: string[];
  refsMap: Record<string, string>;
}


export type RelationshipMap = Record<string, RelationshipNode>;


export interface OverlayData {
  labels: Record<string, Record<string, string>>;
  options: Record<string, Record<string, string[]>>;
  optionLabels: Record<string, Record<string, Record<string, string>>>;
  types: Record<string, ArgumentType>;
  cardinalityRules: Record<string, { min: number; max: number }>;
  conformance: Record<string, any>;
  entryCodes: Record<string, string[] | undefined>;
  characterEncoding: Record<string, any>;
  format: Record<string, any>;
  descriptions?: Record<string, Record<string, string>>;  
}


export interface StepMeta {
  names: Record<string, string>;
  descriptions: Record<string, string>;
}


export interface ParserConfig {
  // If true, enables debug logging during parsing
  debug?: boolean;
  defaultLanguage?: string;
  normalizeEntryCodes?: boolean;
}


export type EntityLookupResult = Bundle | Dependency | null;


export interface PresentationExtraction {
  presentations: AdcForm[];
  mainCaptureBase: string;
  mainTitle: Record<string, string>;
} 