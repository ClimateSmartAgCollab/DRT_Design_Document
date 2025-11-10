"use client";

import React from "react";
import { useThemeCSS } from "./Form/hooks/useTheme";

interface ThemeProviderProps {
  children: React.ReactNode;
  themeName?: "default" | "clientA" | "clientB";
}

export default function ThemeProvider({ children, themeName = "default" }: ThemeProviderProps) {
  const themeCSS = useThemeCSS(themeName);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      {children}
    </>
  );
} 