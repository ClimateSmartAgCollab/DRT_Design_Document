"use client";
import React from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { DateTimeFormatResolver } from "./domain/date-time";

interface DateTimeFieldProps {
  id: string;  // html id + RHF name
  field: { id: string; validation?: { format?: string } };
  format: string;
  fieldValue: any;
  register: UseFormRegisterReturn;
  handleFieldChange: (field: any, value: string) => void;
  saveCurrentPageData: () => void;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  id, field, format, fieldValue, register, handleFieldChange, saveCurrentPageData,
}) => {
  const { onChange: rhfOnChange, onBlur: rhfOnBlur, name: rhfName, ref: rhfRef } = register;
  const { inputType, placeholder } = DateTimeFormatResolver.resolve(format);

  return (
    <input
      id={id}
      name={rhfName}
      type={inputType}
      className="w-full rounded border p-2"
      defaultValue={fieldValue ?? ""}
      placeholder={placeholder}
      ref={(el) => rhfRef(el)}
      onChange={(e) => { rhfOnChange(e); handleFieldChange(field, e.target.value); }}
      onBlur={(e) => { rhfOnBlur(e); saveCurrentPageData(); }}
    />
  );
};

export default DateTimeField;
