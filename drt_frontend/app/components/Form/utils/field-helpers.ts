// drt_frontend/app/components/Form/utils/field-helpers.ts

/**
 * Get placeholder text for the specified language only
 */
export const getPlaceholder = (
  placeholder: string | Record<string, string> | undefined,
  language: string
): string => {
  if (!placeholder) return "";
  
  if (typeof placeholder === "string") {
    return placeholder;
  }
  
  if (typeof placeholder === "object") {
    return placeholder[language] || "";
  }
  
  return "";
};

/**
 * Get option label with language fallback support
 */
export const getOptionLabel = (
  option: any,
  language: string
): string => {
  if (typeof option === "string") return option;
  
  if (typeof option.labels === "object" && option.labels !== null) {
    return option.labels[language] || option.labels.eng || option.labels[Object.keys(option.labels)[0]] || "";
  }
  
  return option.label || option.value || option.code || "Option";
};

/**
 * File type information mapping
 */
export const FILE_TYPE_MAPPINGS = [
  { keywords: ["PDF", "pdf"], icon: "📄", hint: "PDF documents" },
  { keywords: ["Excel", "spreadsheet", "xlsx", "xls"], icon: "📊", hint: "Excel spreadsheets" },
  { keywords: ["Word", "docx", "doc"], icon: "📝", hint: "Word documents" },
  { keywords: ["CSV", "csv"], icon: "📋", hint: "CSV files" },
  { keywords: ["image", "JPEG", "PNG", "jpg", "png", "gif", "webp"], icon: "🖼️", hint: "Image files" },
  { keywords: ["video", "MP4", "mp4", "avi", "mov"], icon: "🎥", hint: "Video files" },
  { keywords: ["audio", "mp3", "wav", "ogg"], icon: "🎵", hint: "Audio files" },
  { keywords: ["ZIP", "archive", "zip", "tar", "gz"], icon: "🗜️", hint: "Archive files" },
  { keywords: ["JSON", "XML", "json", "xml"], icon: "{ }", hint: "Data files" },
] as const;

/**
 * Get file type information from format string
 */
export const getFileTypeInfo = (formatStr?: string): { icon: string; hint: string } => {
  if (!formatStr) return { icon: "📎", hint: "" };
  
  for (const mapping of FILE_TYPE_MAPPINGS) {
    if (mapping.keywords.some(kw => formatStr.includes(kw))) {
      return { icon: mapping.icon, hint: mapping.hint };
    }
  }
  
  return { icon: "📎", hint: formatStr };
};

/**
 * Determine effective input type based on options and array status
 */
export const getEffectiveInputType = (
  inputType: string | undefined,
  isArray: boolean,
  optionsCount: number
): string => {
  if (inputType) return inputType;
  
  if (isArray) return "checkbox-multi";
  
  return optionsCount <= 5 ? "radio-single" : "dropdown-single";
};

/**
 * Parse input type to determine base type and multi-select status
 */
export const parseInputType = (effectiveInputType: string) => {
  const baseType = effectiveInputType.replace(/-single|-multi$/, "");
  const isMulti = effectiveInputType.includes("-multi");
  
  return { baseType, isMulti };
};

/**
 * Format helper text for options
 */
export const getOptionsHelperText = (
  optionsCount: number,
  isMulti: boolean
): string => {
  const selectType = isMulti ? "multi-select" : "single-select";
  return `${optionsCount} options (${selectType})`;
};

