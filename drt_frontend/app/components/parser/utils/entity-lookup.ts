import { Bundle, Dependency, AdcForm, ArgumentType } from '../../type';
import { EntityLookupResult } from '../types/parser-types';


export const findBundleByCaptureBase = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[],
): EntityLookupResult => {
  // Check if it's the main bundle
  if (bundle.capture_base.d === captureBase) {
    return bundle;
  }
  
  // Check dependencies by capture base
  const depByCap = dependencies.find((dep) => dep.capture_base.d === captureBase);
  if (depByCap) {
    return depByCap;
  }
  
  // Check dependencies by 'd' property
  const depByD = dependencies.find((dep) => dep.d === captureBase);
  return depByD ?? null;
};


export const getInteractionArgs = (
  captureBase: string,
  presentations: AdcForm[] | undefined,
): Record<string, ArgumentType> => {
  if (!presentations) {
    return {};
  }
  
  const presentation = presentations.find((p) => p.capture_base === captureBase);
  return presentation?.interaction?.[0]?.arguments ?? {};
};


export const entityExists = (
  captureBase: string,
  bundle: Bundle,
  dependencies: Dependency[],
): boolean => {
  return findBundleByCaptureBase(captureBase, bundle, dependencies) !== null;
};


export const getAllCaptureBases = (
  bundle: Bundle,
  dependencies: Dependency[],
): string[] => {
  const captureBases: string[] = [bundle.capture_base.d];
  
  dependencies.forEach((dep) => {
    captureBases.push(dep.capture_base.d);
  });
  
  return captureBases;
}; 