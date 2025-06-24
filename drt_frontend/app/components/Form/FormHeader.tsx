// drt_frontend\app\components\Form\FormHeader.tsx
"use client";

import React from "react";
import { useTheme } from "./hooks/useTheme";
import styles from "./Form.module.css";

interface FormHeaderProps {
  language: string;
  setLanguage: (lang: string) => void;
  formTitle: Record<string, string>;
}

//Renders the form's title and a language dropdown in the sticky header.
export default function FormHeader({
  language,
  setLanguage,
  formTitle,
}: FormHeaderProps) {
  const theme = useTheme();

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
        style={{ 
          color: theme.colors.primary,
          fontFamily: theme.fonts.heading,
        }}
      >
        {formTitle[language] || formTitle.eng}
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
          <option value="eng">English</option>
          <option value="fra">Français</option>
        </select>
      </div>
    </header>
  );
}
