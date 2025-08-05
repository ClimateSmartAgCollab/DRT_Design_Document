import { Root } from '../../type';

export const asRoot = (json: unknown): Root => json as Root;

export const safeArray = <T>(val: T[] | undefined | null): T[] => 
  Array.isArray(val) ? val : [];

export const langPick = (
  obj: Record<string, Record<string, string>> | undefined, 
  key: string
): Record<string, string> => {
  const res: Record<string, string> = {};
  if (!obj) return res;
  
  Object.keys(obj).forEach((lang) => {
    res[lang] = obj[lang]?.[key] ?? '';
  });
  
  return res;
};

export const numberOr = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const normalizeEntryCodes = (dependencies: any[]): void => {
  dependencies.forEach((dep) => {
    const codes = dep.overlays?.entry_code?.attribute_entry_codes;
    if (codes) {
      dep.overlays!.entry_code!.attribute_entry_codes = Object.fromEntries(
        Object.entries(codes).map(([k, v]) => [k, v ?? []]),
      );
    }
  });
}; 