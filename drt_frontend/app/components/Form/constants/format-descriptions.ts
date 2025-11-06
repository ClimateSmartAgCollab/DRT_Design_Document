// drt_frontend/app/components/Form/constants/format-descriptions.ts

/**
 * Human-readable descriptions for common text format patterns
 */
export const FORMAT_TEXT_DESCRIPTIONS: Record<string, string> = {
  "^.{0,50}$": "Maximum 50 characters",
  "^.{0,100}$": "Maximum 100 characters",
  "^.{0,250}$": "Maximum 250 characters",
  "^.{0,500}$": "Maximum 500 characters",
  "[a-zA-Z0-9_\\.\\+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-\\.]+": "Valid email address",
  "^[A-Z]{2}$": "Two uppercase letters",
  "^\\d{5}$": "5-digit code",
  "^\\d{10}$": "10-digit number",
};

/**
 * Human-readable descriptions for date/time format patterns
 */
export const FORMAT_DATE_DESCRIPTIONS: Record<string, string> = {
  "^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$": "YYYY-MM-DD",
  "^(\\d{4})$": "YYYY (Year only)",
  "^(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])/(\\d{4})$": "MM/DD/YYYY",
  "^(\\d{4})-(0[1-9]|1[0-2])$": "YYYY-MM (Year and month)",
  "^([01]\\d|2[0-3]):([0-5]\\d)$": "HH:MM (24-hour time)",
};

/**
 * Human-readable descriptions for numeric format patterns
 */
export const FORMAT_NUMERIC_DESCRIPTIONS: Record<string, string> = {
  "^[-+]?\\d*\\.?\\d+$": "Any integer or decimal number, may begin with + or -",
  "^-?[0-9]+$": "Any integer",
  "^[0-9]+$": "Positive integer only",
  "^\\d{1,3}$": "1-3 digit number",
  "^(0|[1-9]\\d*)$": "Non-negative integer",
};

/**
 * Human-readable descriptions for binary/file format patterns
 */
export const FORMAT_BINARY_DESCRIPTIONS: Record<string, string> = {
  "application/pdf": "PDF documents",
  "application/json": "JSON data files",
  "application/xml": "XML data files",
  "image/jpeg": "JPEG images",
  "image/png": "PNG images",
  "video/mp4": "MP4 videos",
  "audio/mpeg": "MP3 audio",
  "application/vnd.ms-excel": "Excel spreadsheets",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel (xlsx) files",
  "text/csv": "CSV files",
};

/**
 * Get format description based on regex pattern and field type
 */
export const getFormatDescription = (
  formatRegex?: string,
  type?: string
): string => {
  if (!formatRegex) return "";
  
  if (type?.includes("DateTime")) {
    return FORMAT_DATE_DESCRIPTIONS[formatRegex] || "";
  } else if (type?.includes("Numeric")) {
    return FORMAT_NUMERIC_DESCRIPTIONS[formatRegex] || "";
  } else if (type?.includes("Binary")) {
    return FORMAT_BINARY_DESCRIPTIONS[formatRegex] || "";
  } else if (type?.includes("Text")) {
    return FORMAT_TEXT_DESCRIPTIONS[formatRegex] || "";
  }
  
  return "";
};

