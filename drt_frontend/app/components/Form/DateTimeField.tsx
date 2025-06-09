// drt_frontend\app\components\Form\DateTimeField.tsx
import React from "react";

interface DateTimeFieldProps {
  field: {
    id: string;
    validation?: { format?: string };
  };
  format: string;
  fieldValue: any;
  registerFieldRef: (id: string, el: HTMLInputElement | null) => void;
  handleFieldChange: (field: any, value: string) => void;
  saveCurrentPageData: () => void;
}

/**
 * Renders an <input> of type date, time, month, or week if the regex `format`
 * matches a standard HTML input type. Otherwise, falls back to <input type="text" />
 * with a placeholder describing the expected format.
 */
const DateTimeField: React.FC<DateTimeFieldProps> = ({
  field,
  format,
  fieldValue,
  registerFieldRef,
  handleFieldChange,
  saveCurrentPageData,
}) => {
  function formatPlaceholder(regexFormat: string) {
    switch (regexFormat) {
      case "^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$":
        return "YYYY-MM-DD";
      case "^([01]\\d|2[0-3]):([0-5]\\d)$":
        return "HH:MM (24-hour)";
      case "^(\\d{4})-(0[1-9]|1[0-2])$":
        return "YYYY-MM";
      case "^(?:\\d{4})-W(0[1-9]|[1-4][0-9]|5[0-3])$":
        return "YYYY-Www";
      default:
        return regexFormat;
    }
  }

  const { id } = field;

  // Determine which <input> type to render based on the regex "format" string
  let inputElement: React.ReactNode;

  if (format === "^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$") {
    inputElement = (
      <input
        name={id}
        type="date"
        value={fieldValue || ""}
        className="w-full rounded border p-2"
        ref={(el) => registerFieldRef(id, el)}
        onChange={(e) => {
          handleFieldChange(field, e.target.value);
        }}
        onBlur={saveCurrentPageData}
      />
    );
  } else if (format === "^([01]\\d|2[0-3]):([0-5]\\d)$") {
    inputElement = (
      <input
        name={id}
        type="time"
        value={fieldValue || ""}
        className="w-full rounded border p-2"
        ref={(el) => registerFieldRef(id, el)}
        onChange={(e) => {
          handleFieldChange(field, e.target.value);
        }}
        onBlur={saveCurrentPageData}
      />
    );
  } else if (format === "^(\\d{4})-(0[1-9]|1[0-2])$") {
    inputElement = (
      <input
        name={id}
        type="month"
        value={fieldValue || ""}
        className="w-full rounded border p-2"
        ref={(el) => registerFieldRef(id, el)}
        onChange={(e) => {
          handleFieldChange(field, e.target.value);
        }}
        onBlur={saveCurrentPageData}
      />
    );
  } else if (format === "^(?:\\d{4})-W(0[1-9]|[1-4][0-9]|5[0-3])$") {
    inputElement = (
      <input
        name={id}
        type="week"
        value={fieldValue || ""}
        className="w-full rounded border p-2"
        ref={(el) => registerFieldRef(id, el)}
        onChange={(e) => {
          handleFieldChange(field, e.target.value);
        }}
        onBlur={saveCurrentPageData}
      />
    );
  } else {
    inputElement = (
      <input
        name={id}
        type="text"
        defaultValue={fieldValue || ""}
        placeholder={formatPlaceholder(format)}
        className="w-full rounded border p-2"
        ref={(el) => registerFieldRef(id, el)}
        onChange={(e) => {
          handleFieldChange(field, e.target.value);
        }}
        onBlur={saveCurrentPageData}
      />
    );
  }

  return <>{inputElement}</>;
};

export default DateTimeField;
