// drt_frontend/app/components/Form/DateTimeField.tsx
"use client";

import React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

interface DateTimeFieldProps {
  id: string;  // html id + RHF name
  field: {
    id: string;
    validation?: { format?: string };
  };
  format: string;
  fieldValue: any;
  /** RHF register for this field */
  register: UseFormRegisterReturn;
  handleFieldChange: (field: any, value: string) => void;
  saveCurrentPageData: () => void;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  id,
  field,
  format,
  fieldValue,
  register,
  handleFieldChange,
  saveCurrentPageData,
}) => {
  // 1️⃣ pull RHF handlers & ref
  const {
    onChange: rhfOnChange,
    onBlur:   rhfOnBlur,
    name:     rhfName,
    ref:      rhfRef
  } = register;

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

  // helper to render each <input> type
  const renderInput = (type: string, placeholder?: string) => (
    <input
      id={id}
      name={rhfName}
      type={type}
      className="w-full rounded border p-2"
      defaultValue={fieldValue ?? ""}
      placeholder={placeholder}
      ref={el => {
        rhfRef(el);
      }}
      onChange={e => {
        rhfOnChange(e);
        handleFieldChange(field, e.target.value);
      }}
      onBlur={e => {
        rhfOnBlur(e);
        saveCurrentPageData();
      }}
    />
  );

  // 2️⃣ choose correct input type
  if (format === "^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$") {
    return renderInput("date");
  } else if (format === "^([01]\\d|2[0-3]):([0-5]\\d)$") {
    return renderInput("time");
  } else if (format === "^(\\d{4})-(0[1-9]|1[0-2])$") {
    return renderInput("month");
  } else if (format === "^(?:\\d{4})-W(0[1-9]|[1-4][0-9]|5[0-3])$") {
    return renderInput("week");
  } else {
    // fallback to text with placeholder
    return renderInput("text", formatPlaceholder(format));
  }
};

export default DateTimeField;
