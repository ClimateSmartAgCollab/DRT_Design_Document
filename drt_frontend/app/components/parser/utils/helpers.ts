// drt_frontend/app/components/parser/utils/helpers.ts
import { Root } from "../../type";

export class Arrays {
  static safe<T>(val: T[] | undefined | null): T[] {
    return Array.isArray(val) ? val : [];
  }
}

export class Numbers {
  static or(v: string | undefined, fallback: number): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
}

/** Wraps a language→key→value map with convenient accessors. */
export class LanguageMap {
  constructor(private readonly map?: Record<string, Record<string, string>>) {}

  /** Returns all languages’ values for the given key. */
  pick(key: string): Record<string, string> {
    const res: Record<string, string> = {};
    if (!this.map) return res;
    Object.keys(this.map).forEach((lang) => {
      res[lang] = this.map?.[lang]?.[key] ?? "";
    });
    return res;
  }

  /** Returns a single language value (empty string if missing). */
  get(lang: string, key: string): string {
    return this.map?.[lang]?.[key] ?? "";
  }
}

export class Lang {
  /** One-shot pick without creating a LanguageMap explicitly. */
  static pick(
    obj: Record<string, Record<string, string>> | undefined,
    key: string
  ): Record<string, string> {
    return new LanguageMap(obj).pick(key);
  }

  /** Factory to work with multiple lookups ergonomically. */
  static map(obj?: Record<string, Record<string, string>>): LanguageMap {
    return new LanguageMap(obj);
  }
}

export class Normalizers {
  static normalizeEntryCodes(dependencies: any[]): void {
    dependencies.forEach((dep) => {
      const codes = dep.overlays?.entry_code?.attribute_entry_codes;
      if (codes) {
        dep.overlays!.entry_code!.attribute_entry_codes = Object.fromEntries(
          Object.entries(codes).map(([k, v]) => [k, v ?? []])
        );
      }
    });
  }
}

export const asRoot = (json: unknown): Root => json as Root;
