export type DateInputKind = "date" | "time" | "month" | "week" | "text";

const PATTERNS = {
  DATE: "^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$",
  TIME: "^([01]\\d|2[0-3]):([0-5]\\d)$",
  MONTH: "^(\\d{4})-(0[1-9]|1[0-2])$",
  WEEK: "^(?:\\d{4})-W(0[1-9]|[1-4][0-9]|5[0-3])$",
};

export class DateTimeFormatResolver {
  static resolve(format?: string): { inputType: DateInputKind; placeholder?: string } {
    switch (format) {
      case PATTERNS.DATE:  return { inputType: "date" };
      case PATTERNS.TIME:  return { inputType: "time" };
      case PATTERNS.MONTH: return { inputType: "month" };
      case PATTERNS.WEEK:  return { inputType: "week" };
      default:
        return { inputType: "text", placeholder: this.placeholder(format) };
    }
  }

  private static placeholder(regex?: string) {
    switch (regex) {
      case PATTERNS.DATE:  return "YYYY-MM-DD";
      case PATTERNS.TIME:  return "HH:MM (24-hour)";
      case PATTERNS.MONTH: return "YYYY-MM";
      case PATTERNS.WEEK:  return "YYYY-Www";
      default:             return regex || "";
    }
  }
}
