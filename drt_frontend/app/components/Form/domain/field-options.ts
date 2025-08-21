type FieldLike = {
  id: string;
  options?: Record<string, Record<string, string[] | Record<string, string>>>;
};

export class OptionsMapper {
  /** Normalizes options for a field into a key→label map for a given language. */
  static map(field: FieldLike, language: string): Record<string, string> {
    const raw = field.options?.[language]?.[field.id];
    if (!raw) return {};
    if (Array.isArray(raw)) {
      return raw.reduce<Record<string, string>>((acc, v) => { acc[v] = v; return acc; }, {});
    }
    return raw as Record<string, string>;
  }

  static selected(formData: Record<string, any>, stepId: string, fieldId: string): string[] {
    const v = formData?.[stepId]?.[fieldId];
    return Array.isArray(v) ? v : [];
  }
}
