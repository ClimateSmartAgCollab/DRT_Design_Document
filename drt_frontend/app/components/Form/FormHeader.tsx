"use client";
import React, { useMemo } from "react";
import { useTheme } from "./hooks/useTheme";
import styles from "./Form.module.css";
import { FormHeaderVM } from "./domain/form-header";

interface FormHeaderProps {
  language: string;
  setLanguage: (lang: string) => void;
  formTitle: Record<string, string>;
  rightContent?: React.ReactNode;
}

export default function FormHeader({
  language,
  setLanguage,
  formTitle,
  rightContent,
}: FormHeaderProps) {
  const theme = useTheme();
  const vm = useMemo(() => new FormHeaderVM(formTitle), [formTitle]);

  return (
    <header
      className={styles.header}
      style={{
        backgroundColor: theme.colors.white,
        borderBottom: `1px solid ${theme.colors.grey[300]}`,
        fontFamily: theme.fonts.body,
      }}
    >
      <h1
        className="text-3xl font-bold"
        style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
      >
        {vm.title(language)}
      </h1>
      <div className="flex items-center space-x-2">
        <label
          htmlFor="language"
          className="text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          Language:
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={`block w-40 rounded border px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 ${styles.languageSelector}`}
          style={{
            borderColor: theme.colors.grey[300],
            backgroundColor: theme.colors.white,
            color: theme.colors.text,
            fontFamily: theme.fonts.body,
          }}
        >
          {vm.languages().map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        {rightContent}
      </div>
    </header>
  );
}
