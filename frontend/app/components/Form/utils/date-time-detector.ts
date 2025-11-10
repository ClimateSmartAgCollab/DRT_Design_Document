/**
 * This enables native browser calendar/time pickers
 */

export type DateTimeInputType = "date" | "time" | "datetime-local" | "month" | "week" | "text";

export interface DateTimeConfig {
  inputType: DateTimeInputType;
  placeholder: string;
}

export class DateTimeDetector {

  static detect(format?: string): DateTimeConfig {
    if (!format) {
      return { inputType: "date", placeholder: "YYYY-MM-DD" };
    }

    // Analyze regex structure to determine date/time type
    const hasYear = format.includes("\\d{4}");
    const hasMonth = format.includes("0[1-9]|1[0-2]") || format.includes("01]?[0-9]");
    const hasDay = format.includes("[12]\\d|3[01]") || format.includes("[0-3]?[0-9]");
    const hasHour = format.includes("[01]\\d|2[0-3]") || format.includes("[0-2]?[0-9]");
    const hasMinute = format.includes("[0-5]\\d");
    const hasSecond = format.includes(":([0-5]\\d)");
    const hasColon = format.includes(":");
    const hasDash = format.includes("-");
    const hasSlash = format.includes("/");
    const hasWeek = format.includes("-W") || format.includes("W[0-9]");
    const hasT = format.includes("T");

    // Week format (YYYY-Www) - HTML5 week picker
    if (hasYear && hasWeek) {
      return { inputType: "week", placeholder: "YYYY-Www" };
    }

    // DateTime combined (YYYY-MM-DDTHH:MM) - HTML5 datetime-local picker
    if (hasYear && hasMonth && hasDay && hasHour && hasMinute && (hasT || hasDash)) {
      return { inputType: "datetime-local", placeholder: "YYYY-MM-DDTHH:MM" };
    }

    // Full date (YYYY-MM-DD) - HTML5 date picker with calendar
    if (hasYear && hasMonth && hasDay && !hasHour) {
      if (hasDash) {
        return { inputType: "date", placeholder: "YYYY-MM-DD" };
      }
      if (hasSlash) {
        // For slash formats, use text input as HTML5 date only supports YYYY-MM-DD
        return { inputType: "text", placeholder: "MM/DD/YYYY" };
      }
      return { inputType: "date", placeholder: "YYYY-MM-DD" };
    }

    // Month only (YYYY-MM) - HTML5 month picker
    if (hasYear && hasMonth && !hasDay && !hasHour) {
      return { inputType: "month", placeholder: "YYYY-MM" };
    }

    // Year only (YYYY) - use text input
    if (hasYear && !hasMonth && !hasDay && !hasHour) {
      return { inputType: "text", placeholder: "YYYY" };
    }

    // Time only (HH:MM or HH:MM:SS) - HTML5 time picker
    if (hasColon && (hasHour || hasMinute)) {
      if (hasSecond) {
        return { inputType: "time", placeholder: "HH:MM:SS" };
      }
      return { inputType: "time", placeholder: "HH:MM" };
    }

    // Fallback to text input with format hint
    return { inputType: "text", placeholder: format.slice(0, 30) };
  }
}

