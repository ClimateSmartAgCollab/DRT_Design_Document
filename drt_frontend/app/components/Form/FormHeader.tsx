// drt_frontend\app\components\Form\FormHeader.tsx
"use client";

import React from "react";
import styles from "./Form.module.css";

interface FormHeaderProps {
  language: string;
  setLanguage: (lang: string) => void;
  formTitle: Record<string, string>;
}

//Renders the form’s title and a language dropdown in the sticky header.
export default function FormHeader({
  language,
  setLanguage,
  formTitle,
}: FormHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className="text-3xl font-bold">
        {formTitle[language] || formTitle.eng}
      </h1>
      <div className="flex items-center space-x-2">
        <label htmlFor="language" className="text-sm font-medium text-gray-700">
          Language:
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="block w-40 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="eng">English</option>
          <option value="fra">Français</option>
        </select>
      </div>
    </header>
  );
}
