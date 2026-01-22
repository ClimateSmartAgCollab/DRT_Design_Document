"use client";
import React, { useMemo } from "react";
import { ParsedField, ParsedStep } from "./types";
import { useFormData } from "../Form/context/FormDataContext";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useTheme } from "./hooks/useTheme";
import {
  ReferenceFieldController,
  type ReferenceDeps,
} from "./domain/reference-controller";
import { FieldValidator } from "./domain/validation";
import { DateTimeDetector } from "./utils/date-time-detector";
import {
  Box,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  FormGroup,
  MenuItem,
  Select,
  FormControl,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Typography,
} from "@mui/material";


// Helper to get file type info from format
const getFileTypeInfo = (formatStr: string): { icon: string; hint: string } => {
  if (!formatStr) return { icon: "📎", hint: "" };
  
  const mappings = [
    { keywords: ["PDF", "pdf"], icon: "📄", hint: "PDF documents" },
    { keywords: ["Excel", "spreadsheet", "xlsx"], icon: "📊", hint: "Excel spreadsheets" },
    { keywords: ["Word", "docx"], icon: "📝", hint: "Word documents" },
    { keywords: ["CSV", "csv"], icon: "📋", hint: "CSV files" },
    { keywords: ["image", "JPEG", "PNG", "jpg", "png"], icon: "🖼️", hint: "Image files" },
    { keywords: ["video", "MP4", "mp4"], icon: "🎥", hint: "Video files" },
    { keywords: ["audio", "mp3", "wav"], icon: "🎵", hint: "Audio files" },
    { keywords: ["ZIP", "archive", "zip"], icon: "🗜️", hint: "Archive files" },
    { keywords: ["JSON", "XML", "json"], icon: "{ }", hint: "Data files" },
  ];
  
  for (const mapping of mappings) {
    if (mapping.keywords.some(kw => formatStr.includes(kw))) {
      return { icon: mapping.icon, hint: mapping.hint };
    }
  }
  
  return { icon: "📎", hint: formatStr };
};

interface FieldRendererProps {
  register: UseFormRegisterReturn;
  id: string;
  field: ParsedField;
  value: any;
  language: string;
  registerFieldRef: (
    id: string,
    el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  ) => void;
  handleFieldChange: (newVal: any) => void;
  saveCurrentPageData: () => void;
  onNavigate: (stepIndex: number, pageIndex?: number) => void;
  parsedSteps: ParsedStep[];
  parentFormData: Record<string, any>;
  setIsNewChild: (v: boolean) => void;
  setCurrentChildId: (id: string | null) => void;
  setCurrentChildParentId: (id: string | null) => void;
  clearCurrentStepFormData: () => void;
}

export default function FieldRenderer(props: FieldRendererProps) {
  const {
    register,
    id,
    field,
    value,
    language,
    registerFieldRef,
    handleFieldChange,
    saveCurrentPageData,
    onNavigate,
    parsedSteps,
    parentFormData,
    setIsNewChild,
    setCurrentChildId,
    setCurrentChildParentId,
    clearCurrentStepFormData,
  } = props;

  const theme = useTheme();
  const { createNewChild: ctxCreate, deleteChild: ctxDelete } = useFormData();

  const [datalistInputValue, setDatalistInputValue] = React.useState("");
  const [numericInputValue, setNumericInputValue] = React.useState<string>(
    value?.toString() || ""
  );
  const [numericError, setNumericError] = React.useState<string | null>(null);
  const [arrayNumericError, setArrayNumericError] = React.useState<string | null>(null);
  const [arrayDateTimeError, setArrayDateTimeError] = React.useState<string | null>(
    null
  );
  const [arrayTextError, setArrayTextError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (field.type === "Numeric") {
      setNumericInputValue(value?.toString() || "");
      setNumericError(null);
    } else {
      setNumericInputValue("");
      setNumericError(null);
    }
  }, [field.type, value]);

  React.useEffect(() => {
    setDatalistInputValue("");
    setArrayNumericError(null);
    setArrayDateTimeError(null);
    setArrayTextError(null);
  }, [id]);

  const {
    onChange: rhfOnChange,
    onBlur: rhfOnBlur,
    name: rhfName,
    ref: rhfRef,
  } = register;

  const fieldStyles = {
    border: `1px solid ${theme.colors.grey[300]}`,
    backgroundColor: theme.colors.white,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
  };

  const controller = useMemo(() => {
    const deps: ReferenceDeps = {
      createNewChild: ctxCreate,
      deleteChild: ctxDelete,
      onNavigate,
      findStepIndex: (steps, sid) => steps.findIndex((s) => s.id === sid),
      clearCurrentStepFormData,
      setCurrentChildId,
      setCurrentChildParentId,
      setIsNewChild,
    };
    return new ReferenceFieldController(parsedSteps, deps);
  }, [
    parsedSteps,
    ctxCreate,
    ctxDelete,
    onNavigate,
    clearCurrentStepFormData,
    setCurrentChildId,
    setCurrentChildParentId,
    setIsNewChild,
  ]);

  // Helper: Render list inputs (entry codes or boolean options)
  const renderListInput = (
    options: [string, string][],
    inputType: string | undefined,
    isArray: boolean,
    selectedValue: any,
    onChange: (val: any) => void
  ) => {
    const effectiveInputType = inputType || (isArray ? 'checkbox-multi' : (options.length <= 5 ? 'radio-single' : 'dropdown-single'));
    const baseType = effectiveInputType.replace(/-single|-multi$/, '');
    const isMulti = effectiveInputType.includes('-multi');
    
    const selectedValues = isMulti ? (Array.isArray(selectedValue) ? selectedValue : []) : selectedValue;
    
    switch (baseType) {
      case 'checkbox':
        return (
          <Box>
            {isMulti && selectedValues.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', mb: 1 }}>
                {selectedValues.map((val: string, idx: number) => (
                  <Chip
                    key={idx}
                    label={options.find(([k]) => k === val)?.[1] || val}
                    size="small"
                    onDelete={() => {
                      const updated = selectedValues.filter((_: any, i: number) => i !== idx);
                      onChange(updated);
                      saveCurrentPageData();
                    }}
                  />
                ))}
              </Box>
            )}
            <FormGroup>
              {options.map(([optKey, optLabel]) => (
                <FormControlLabel
                  key={optKey}
                  control={
                    <Checkbox
                      checked={selectedValues.includes(optKey)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...selectedValues, optKey]
                          : selectedValues.filter((v: string) => v !== optKey);
                        onChange(updated);
                        (rhfOnChange as any)({ target: { value: updated } });
                        saveCurrentPageData();
                      }}
                      size="small"
                    />
                  }
                  label={<span className="text-sm">{optLabel}</span>}
                />
              ))}
            </FormGroup>
          </Box>
        );
      
      case 'radio':
        return (
          <RadioGroup
            value={selectedValues || ""}
            onChange={(e) => {
              onChange(e.target.value);
              rhfOnChange(e);
              saveCurrentPageData();
            }}
            row={field.orientation === 'horizontal'}
          >
            {options.map(([optKey, optLabel]) => (
              <FormControlLabel
                key={optKey}
                value={optKey}
                control={<Radio size="small" />}
                label={<span className="text-sm">{optLabel}</span>}
              />
            ))}
          </RadioGroup>
        );
      
      case 'dropdown':
      case 'select':
        if (isMulti) {
          return (
            <FormControl fullWidth size="small">
              <Select
                multiple
                value={selectedValues}
                onChange={(e) => {
                  onChange(e.target.value);
                  (rhfOnChange as any)({ target: { value: e.target.value } });
                  saveCurrentPageData();
                }}
                renderValue={(selected: string[]) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((val) => (
                      <Chip key={val} label={options.find(([k]) => k === val)?.[1] || val} size="small" />
                    ))}
                  </Box>
                )}
              >
                {options.map(([optKey, optLabel]) => (
                  <MenuItem key={optKey} value={optKey}>{optLabel}</MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        } else {
          return (
            <FormControl fullWidth size="small">
              <Select
                value={selectedValues || ""}
                onChange={(e) => {
                  onChange(e.target.value);
                  rhfOnChange(e);
                  saveCurrentPageData();
                }}
              >
                {options.map(([optKey, optLabel]) => (
                  <MenuItem key={optKey} value={optKey}>{optLabel}</MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }
      
      case 'toggle':
      case 'button-group':
        return (
          <ToggleButtonGroup
            value={isMulti ? selectedValues : selectedValues}
            onChange={(e, newValue) => {
              onChange(newValue);
              (rhfOnChange as any)({ target: { value: newValue } });
              saveCurrentPageData();
            }}
            exclusive={!isMulti}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {options.map(([optKey, optLabel]) => (
              <ToggleButton
                key={optKey}
                value={optKey}
                sx={{ textTransform: 'none', fontSize: '0.875rem' }}
              >
                {optLabel}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        );
      
      case 'datalist':
        if (isMulti) {
          // Multi-select datalist with chip input
          return (
            <Box>
              {selectedValues.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', mb: 1 }}>
                  {selectedValues.map((val: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={options.find(([k]) => k === val)?.[1] || val}
                      size="small"
                      onDelete={() => {
                        const updated = selectedValues.filter((_: any, i: number) => i !== idx);
                        onChange(updated);
                        saveCurrentPageData();
                      }}
                    />
                  ))}
                </Box>
              )}
              <TextField
                fullWidth
                size="small"
                value={datalistInputValue}
                onChange={(e) => setDatalistInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const currentValue = (e.currentTarget as HTMLInputElement).value.trim();
                    if (!currentValue) {
                      return;
                    }
                    if (!selectedValues.includes(currentValue)) {
                      const updated = [...selectedValues, currentValue];
                      onChange(updated);
                      (rhfOnChange as any)({ target: { value: updated } });
                      saveCurrentPageData();
                    }
                    setDatalistInputValue("");
                  }
                }}
                onBlur={(e) => {
                  const currentValue = (e.currentTarget as HTMLInputElement).value.trim();
                  if (currentValue && !selectedValues.includes(currentValue)) {
                    const updated = [...selectedValues, currentValue];
                    onChange(updated);
                    (rhfOnChange as any)({ target: { value: updated } });
                    saveCurrentPageData();
                  }
                  setDatalistInputValue("");
                }}
                placeholder="Type or select, press Enter to add..."
                slotProps={{ htmlInput: { list: `datalist-${id}` } }}
              />
              <datalist id={`datalist-${id}`}>
                {options.map(([optKey, optLabel]) => (
                  <option key={optKey} value={optKey}>{optLabel}</option>
                ))}
              </datalist>
              <span className="text-xs text-gray-500 mt-1 block">
                Type or select from {options.length} options. Press Enter to add each item.
              </span>
            </Box>
          );
        } else {
          // Single-select datalist
          return (
            <Box>
              <TextField
                fullWidth
                size="small"
                value={selectedValues || ""}
                onChange={(e) => {
                  onChange(e.target.value);
                  rhfOnChange(e);
                }}
                onBlur={saveCurrentPageData}
                placeholder="Type or select from list..."
                slotProps={{ htmlInput: { list: `datalist-${id}` } }}
              />
              <datalist id={`datalist-${id}`}>
                {options.map(([optKey, optLabel]) => (
                  <option key={optKey} value={optKey}>{optLabel}</option>
                ))}
              </datalist>
              <span className="text-xs text-gray-500 mt-1 block">
                Searchable dropdown with {options.length} options
              </span>
            </Box>
          );
        }
      
      case 'slider':
      case 'range':
        // Range slider (for numeric options)
        if (options.length >= 2) {
          const currentIndex = isMulti 
            ? selectedValues.length > 0 ? options.findIndex(([k]) => k === selectedValues[0]) : 0
            : options.findIndex(([k]) => k === selectedValues);
          const sliderValue = currentIndex >= 0 ? currentIndex : 0;
          
          return (
            <Box sx={{ px: 2, py: 1 }}>
              {isMulti && selectedValues.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', mb: 2 }}>
                  {selectedValues.map((val: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={options.find(([k]) => k === val)?.[1] || val}
                      size="small"
                      onDelete={() => {
                        const updated = selectedValues.filter((_: any, i: number) => i !== idx);
                        onChange(updated);
                        saveCurrentPageData();
                      }}
                    />
                  ))}
                </Box>
              )}
              <Slider
                value={sliderValue}
                onChange={(e, newValue) => {
                  const selectedKey = options[newValue as number][0];
                  if (isMulti) {
                    if (!selectedValues.includes(selectedKey)) {
                      const updated = [...selectedValues, selectedKey];
                      onChange(updated);
                      (rhfOnChange as any)({ target: { value: updated } });
                    }
                  } else {
                    onChange(selectedKey);
                    (rhfOnChange as any)({ target: { value: selectedKey } });
                  }
                }}
                onChangeCommitted={saveCurrentPageData}
                marks
                min={0}
                max={options.length - 1}
                step={1}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => options[value]?.[1] || ""}
                sx={{
                  color: theme.colors.primary,
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.75rem',
                    color: theme.colors.grey[600]
                  }
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" sx={{ color: theme.colors.grey[600] }}>
                  {options[0][1]}
                </Typography>
                <Typography variant="caption" sx={{ color: theme.colors.grey[600] }}>
                  {options[options.length - 1][1]}
                </Typography>
              </Box>
            </Box>
          );
        }
        return isMulti ? (
          <FormGroup>
            {options.map(([optKey, optLabel]) => (
              <FormControlLabel
                key={optKey}
                control={
                  <Checkbox
                    checked={selectedValues.includes(optKey)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...selectedValues, optKey]
                        : selectedValues.filter((v: string) => v !== optKey);
                      onChange(updated);
                      (rhfOnChange as any)({ target: { value: updated } });
                      saveCurrentPageData();
                    }}
                  />
                }
                label={optLabel}
              />
            ))}
          </FormGroup>
        ) : (
          <RadioGroup value={selectedValues || ""} onChange={(e) => { onChange(e.target.value); rhfOnChange(e); saveCurrentPageData(); }}>
            {options.map(([optKey, optLabel]) => (
              <FormControlLabel key={optKey} value={optKey} control={<Radio />} label={optLabel} />
            ))}
          </RadioGroup>
        );
      
      default:
        // Fallback to checkbox/radio
        return isMulti ? (
          <FormGroup>
            {options.map(([optKey, optLabel]) => (
              <FormControlLabel
                key={optKey}
                control={
                  <Checkbox
                    checked={selectedValues.includes(optKey)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...selectedValues, optKey]
                        : selectedValues.filter((v: string) => v !== optKey);
                      onChange(updated);
                      (rhfOnChange as any)({ target: { value: updated } });
                      saveCurrentPageData();
                    }}
                  />
                }
                label={optLabel}
              />
            ))}
          </FormGroup>
        ) : (
          <RadioGroup value={selectedValues || ""} onChange={(e) => { onChange(e.target.value); rhfOnChange(e); saveCurrentPageData(); }}>
            {options.map(([optKey, optLabel]) => (
              <FormControlLabel key={optKey} value={optKey} control={<Radio />} label={optLabel} />
            ))}
          </RadioGroup>
        );
    }
  };

  const hasEntryCodeOptions = field.options?.[language]?.[field.id] && 
    Object.keys(field.options[language][field.id]).length > 0;
  const hasBooleanOptions = field.booleanOptions && field.booleanOptions.length > 0;
  const hasOptions = hasEntryCodeOptions || hasBooleanOptions;
  
  if (hasOptions) {
    let entryCodeOptions: [string, string][] = [];
    
    if (hasEntryCodeOptions) {
      const optionsData = field.options[language][field.id];
      const labelsData = field.optionLabels?.[language]?.[field.id] || {};
      
      if (Array.isArray(optionsData)) {
        entryCodeOptions = optionsData.map(key => {
          const label = typeof labelsData === 'object' && labelsData !== null && !Array.isArray(labelsData)
            ? (labelsData as Record<string, string>)[key] || key
            : key;
          return [key, label] as [string, string];
        });
      } else {
        entryCodeOptions = Object.entries(optionsData);
      }
    }
    
    const boolOpts = hasBooleanOptions 
      ? field.booleanOptions!.map(o => [o, o] as [string, string])
      : [];
    const finalOptions = entryCodeOptions.length > 0 ? entryCodeOptions : boolOpts;
    const isArray = field.type.startsWith("Array[");
    
    return renderListInput(finalOptions, field.inputType, isArray, value, handleFieldChange);
  }
  
  // 1) TEXTAREA
  if (field.type === "textarea") {
    return (
        <textarea
          id={id}
          name={rhfName}
          value={value ?? ""}
          placeholder={
            typeof field.placeholder === 'string' 
              ? field.placeholder 
              : (field.placeholder?.[language] || "")
          }
          className="w-full rounded p-2"
          style={fieldStyles}
          ref={(el) => {
            rhfRef(el);
            registerFieldRef(field.id, el);
          }}
          onChange={(e) => {
            rhfOnChange(e);
            handleFieldChange(e.target.value);
          }}
          onBlur={(e) => {
            rhfOnBlur(e);
            saveCurrentPageData();
          }}
        />
    );
  }

  // 2) DATE/TIME 
  if (field.type === "DateTime") {
    const { inputType, placeholder: detectedPlaceholder } = DateTimeDetector.detect(field.validation?.format);
    
    const placeholder = typeof field.placeholder === 'string' 
      ? field.placeholder 
      : (field.placeholder?.[language] || detectedPlaceholder);
    
    return (
      <input
        type={inputType}
        id={id}
        name={rhfName}
        value={value ?? ""}
        placeholder={placeholder}
        className="w-full rounded p-2"
        style={{
          ...fieldStyles,
          height: '40px',
          fontSize: '0.875rem'
        }}
        ref={(el) => {
          rhfRef(el);
          registerFieldRef(field.id, el);
        }}
        onChange={(e) => {
          handleFieldChange(e.target.value);
          rhfOnChange(e);
        }}
        onBlur={(e) => {
          rhfOnBlur(e);
          saveCurrentPageData();
        }}
      />
    );
  }

  // 5) REFERENCE FIELD
  if (field.type === "reference" && field.ref) {
    const children = (parentFormData[field.id]?.childrenData?.[field.ref] ??
      []) as Array<any>;
    const childStepName = parsedSteps.find((s) => s.id === field.ref)?.names[
      language
    ];

    return (
        <div>
          <button
            type="button"
            onClick={() => controller.openNew(field)}
            className="mt-2 rounded px-3 py-1 text-white hover:opacity-90"
            style={{ backgroundColor: theme.colors.primary }}
          >
            +{" "}
            {field.reference_button_text?.[language] ||
              field.reference_button_text?.eng ||
              "Child Step"}
          </button>

          {children.length > 0 && (
            <div className="mt-4 rounded border bg-gray-100 p-4">
              <h4 className="mb-2 text-lg font-semibold">{childStepName}</h4>
              <table className="w-full table-fixed border border-gray-300">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="w-64 border border-gray-300 px-4 py-2 text-left">
                      Attributes
                    </th>
                    <th className="w-32 border border-gray-300 px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {children.map((child) => (
                    <tr key={child.id}>
                      <td className="break-words border border-gray-300 px-4 py-2">
                        {field.showing_attribute?.map((attr) => {
                          const childStep = parsedSteps.find(
                            (s) => s.id === field.ref
                          );
                          const childField =
                            childStep?.pages?.[0]?.sections?.[0]?.fields?.find(
                              (f) => f.id === attr
                            );
                          const label =
                            childField?.labels?.[language]?.[attr] ||
                            childField?.labels?.eng?.[attr] ||
                            attr;
                          return (
                            <div
                              key={attr}
                              className="mt-2 text-sm text-gray-700"
                            >
                              <strong>{label}: </strong>
                              <span>{child.data[attr] || "(No Data)"}</span>
                            </div>
                          );
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => controller.editExisting(field, child)}
                            className="mt-2 rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => controller.delete(field, child.id)}
                            className="mt-2 rounded px-3 py-1 text-white hover:opacity-90"
                            style={{ backgroundColor: theme.colors.primary }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    );
  }

  // 3) BOOLEAN (without options - uses defaults)
  if (field.type === "Boolean") {
    const boolOpts = ['True', 'False'];
    return (
        <RadioGroup
          value={value || ""}
          onChange={(e) => {
            handleFieldChange(e.target.value);
            rhfOnChange(e);
            saveCurrentPageData();
          }}
          row
        >
          {boolOpts.map((opt) => (
            <FormControlLabel
              key={opt}
              value={opt.toLowerCase()}
              control={<Radio size="small" />}
              label={<span className="text-sm">{opt}</span>}
            />
        ))}
      </RadioGroup>
  );
}

// 4) ARRAY[BOOLEAN] (without options)
if (field.type === "Array[Boolean]") {
  const boolOpts = ['True', 'False', 'Yes', 'No', '1', '0'];
  const selectedValues = Array.isArray(value) ? value : [];
  
  return (
        <Box>
          {selectedValues.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', mb: 1 }}>
              {selectedValues.map((val: string, idx: number) => (
                <Chip
                  key={idx}
                  label={val}
                  size="small"
                  onDelete={() => {
                    const updated = selectedValues.filter((_: any, i: number) => i !== idx);
                    handleFieldChange(updated);
                    saveCurrentPageData();
                  }}
                />
              ))}
            </Box>
          )}
          <FormGroup>
            {boolOpts.map((opt) => (
              <FormControlLabel
                key={opt}
                control={
                  <Checkbox
                    checked={selectedValues.includes(opt)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...selectedValues, opt]
                        : selectedValues.filter((v: string) => v !== opt);
                      handleFieldChange(updated);
                      (rhfOnChange as any)({ target: { value: updated } });
                      saveCurrentPageData();
                    }}
                    size="small"
                  />
                }
                label={<span className="text-sm">{opt}</span>}
              />
        ))}
      </FormGroup>
    </Box>
);
}

// 5) NUMERIC
if (field.type === "Numeric") {
  const placeholder =
    typeof field.placeholder === "string"
    ? field.placeholder 
      : field.placeholder?.[language] || "";
    
  return (
        <TextField
      type="text" // Changed from "number" to allow format validation
          fullWidth
          size="small"
      value={numericInputValue}
        error={!!numericError}
        helperText={numericError}
        onChange={(e) => {
          const inputVal = e.target.value;
        setNumericInputValue(inputVal);
          
          if (!inputVal) {
            setNumericError(null);
            handleFieldChange("");
            rhfOnChange(e);
            return;
          }
          
          const num = parseFloat(inputVal);
          
          // Use FieldValidator for all validation logic (pass string for validation)
          const validationError = FieldValidator.validate(field, inputVal, language);
          
          if (validationError) {
            setNumericError(validationError);
            handleFieldChange("");
            rhfOnChange(e);
            return;
          }
          
          // Valid number
          setNumericError(null);
          handleFieldChange(num);
          rhfOnChange(e);
        }}
      onBlur={saveCurrentPageData}
      placeholder={placeholder}
    />
);
}

// 6) ARRAY[NUMERIC]
if (field.type === "Array[Numeric]") {
  const selectedValues = Array.isArray(value) ? value : [];
  const placeholder =
    typeof field.placeholder === "string"
    ? field.placeholder 
      : field.placeholder?.[language] || "";
    
  return (
        <Box>
          {selectedValues.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", mb: 1 }}>
              {selectedValues.map((val: number, idx: number) => (
                <Chip
                  key={idx}
                  label={String(val)}
                  size="small"
                  onDelete={() => {
                    const updated = selectedValues.filter((_: any, i: number) => i !== idx);
                    handleFieldChange(updated);
                    saveCurrentPageData();
                  }}
                />
              ))}
            </Box>
          )}
          <TextField
        type="text" // Changed from "number" to allow validation
            fullWidth
            size="small"
            placeholder={placeholder}
        error={!!arrayNumericError}
        helperText={arrayNumericError}
          onKeyDown={(e) => {
          if (e.key === "Enter") {
              e.preventDefault();
            const inputVal = (e.currentTarget as HTMLInputElement).value.trim();
              
              if (!inputVal) {
                return;
              }
              
              const num = parseFloat(inputVal);
              
              const validationError = FieldValidator.validate(field, inputVal, language);
              
              if (validationError) {
              setArrayNumericError(validationError);
                return;
              }
              
            setArrayNumericError(null);
              handleFieldChange([...selectedValues, num]);
            (e.currentTarget as HTMLInputElement).value = "";
            }
          }}
        onChange={() => setArrayNumericError(null)}
      />
    </Box>
);
}

  // 7) ARRAY[DATETIME] 
  if (field.type === "Array[DateTime]") {
    const selectedValues = Array.isArray(value) ? value : [];
    
    const { inputType, placeholder: detectedPlaceholder } = DateTimeDetector.detect(field.validation?.format);
    
    const placeholder = typeof field.placeholder === 'string' 
      ? field.placeholder 
      : (field.placeholder?.[language] || detectedPlaceholder);
    
    return (
      <Box>
        {selectedValues.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', mb: 1 }}>
            {selectedValues.map((val: string, idx: number) => (
              <Chip
                key={idx}
                label={val}
                size="small"
                onDelete={() => {
                  const updated = selectedValues.filter((_: any, i: number) => i !== idx);
                  handleFieldChange(updated);
                  saveCurrentPageData();
                }}
              />
            ))}
          </Box>
        )}
        <Box>
          <input
            type={inputType}
            placeholder={placeholder}
            className="w-full rounded p-2"
            style={{
              ...fieldStyles,
              height: '40px',
              fontSize: '0.875rem'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) {
                  const validationError = FieldValidator.validate(field, val, language);
                  
                  if (validationError) {
                    setArrayDateTimeError(validationError);
                    return;
                  }
                  
                  setArrayDateTimeError(null);
                  handleFieldChange([...selectedValues, val]);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
            onChange={() => setArrayDateTimeError(null)}
          />
          {arrayDateTimeError && (
            <Typography variant="caption" sx={{ color: theme.colors.secondary, display: 'block', mt: 0.5 }}>
              {arrayDateTimeError}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: theme.colors.grey[600], display: 'block', mt: 0.5 }}>
            Select a date/time and press Enter to add
          </Typography>
        </Box>
      </Box>
    );
  }

// 8) BINARY
if (field.type === "Binary") {
  const formatStr = field.validation?.format || "";
  const { icon, hint } = getFileTypeInfo(formatStr);
  
  return (
        <Box
          sx={{
            border: '2px dashed #a8a8a8',
            borderRadius: 1,
            p: 2,
            textAlign: 'center',
            backgroundColor: '#F5F5F5',
            cursor: 'pointer',
          }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFieldChange(file);
                saveCurrentPageData();
              }
            };
            input.click();
          }}
        >
          {value && typeof value === 'object' && value.name && (
            <Box sx={{ mb: 1 }}>
              <Chip
                label={value.name}
                size="small"
                onDelete={() => {
                  handleFieldChange(null);
                  saveCurrentPageData();
                }}
              />
            </Box>
          )}
          <span className="text-base">{icon} File upload area</span>
          <div className="text-xs text-gray-500 mt-2">Click or drag file to upload</div>
      {hint && <div className="text-xs mt-1 font-semibold" style={{ color: '#94002a' }}>Accepts: {hint}</div>}
    </Box>
);
}

// 9) ARRAY[BINARY]
if (field.type === "Array[Binary]") {
  const selectedFiles = Array.isArray(value) ? value : [];
  const formatStr = field.validation?.format || "";
  const { icon, hint } = getFileTypeInfo(formatStr);
  
  return (
        <Box>
          {selectedFiles.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', mb: 1 }}>
              {selectedFiles.map((file: any, idx: number) => (
                <Chip
                  key={idx}
                  label={typeof file === 'string' ? file : (file?.name || `file${idx + 1}`)}
                  size="small"
                  onDelete={() => {
                    const updated = selectedFiles.filter((_: any, i: number) => i !== idx);
                    handleFieldChange(updated);
                    saveCurrentPageData();
                  }}
                />
              ))}
            </Box>
          )}
          <Box
            sx={{
              border: '2px dashed #a8a8a8',
              borderRadius: 1,
              p: 2,
              textAlign: 'center',
              backgroundColor: '#F5F5F5',
              cursor: 'pointer',
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.onchange = (e: any) => {
                const files = Array.from(e.target.files);
                handleFieldChange([...selectedFiles, ...files]);
                saveCurrentPageData();
              };
              input.click();
            }}
          >
            <span className="text-base">{icon} File upload area</span>
            <div className="text-xs text-gray-500 mt-2">Multiple files - Click or drag to upload</div>
      {hint && <div className="text-xs mt-1 font-semibold" style={{ color: '#94002a' }}>Accepts: {hint}</div>}
    </Box>
  </Box>
);
}

  // 10) ARRAY[TEXT] (without entry codes)
  if (field.type === "Array[Text]") {
    const selectedValues = Array.isArray(value) ? value : [];
    const placeholder =
      typeof field.placeholder === "string"
      ? field.placeholder 
        : field.placeholder?.[language] || "";
    
    return (
      <Box>
        {selectedValues.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", mb: 1 }}>
            {selectedValues.map((val: string, idx: number) => (
              <Chip
                key={idx}
                label={val}
                size="small"
                onDelete={() => {
                  const updated = selectedValues.filter((_: any, i: number) => i !== idx);
                  handleFieldChange(updated);
                  saveCurrentPageData();
                }}
              />
            ))}
          </Box>
        )}
        <TextField
          fullWidth
          size="small"
          placeholder={placeholder}
          error={!!arrayTextError}
          helperText={arrayTextError}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const val = (e.currentTarget as HTMLInputElement).value.trim();
              if (val) {
                const validationError = FieldValidator.validate(field, val, language);
                
                if (validationError) {
                  setArrayTextError(validationError);
                  return;
                }
                
                setArrayTextError(null);
                handleFieldChange([...selectedValues, val]);
                (e.currentTarget as HTMLInputElement).value = "";
              }
            }
          }}
          onChange={() => setArrayTextError(null)}
        />
      </Box>
    );
  }

// 11) DEFAULT TEXT
return (
      <TextField
        fullWidth
        size="small"
        value={value ?? ""}
        onChange={(e) => {
          handleFieldChange(e.target.value);
          rhfOnChange(e);
        }}
        onBlur={saveCurrentPageData}
        placeholder={
          typeof field.placeholder === 'string' 
            ? field.placeholder 
            : (field.placeholder?.[language] || "")
      }
    />
);
}
