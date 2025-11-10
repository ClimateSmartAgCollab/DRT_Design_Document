"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.theme === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded bg-gray-200 dark:bg-gray-700"
    >
      {dark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
