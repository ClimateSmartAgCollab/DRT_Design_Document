"use client";
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ParsedStep } from "./types";
import { useTheme } from "./hooks/useTheme";
import styles from "./Form.module.css";
import {
  StepIndexResolver,
  buildFlatSidebarPages,
  type FlatSidebarPage,
} from "./domain/sidebar";

const INDENT_PX_PER_LEVEL = 16;

interface SidebarProps {
  parsedSteps: ParsedStep[];
  currentStep: ParsedStep;
  pageIndexByStep: Record<string, number>;
  onNavigate: (stepIndex: number, pageIndex?: number) => void;
  language: string;
  openChildStepIds: Set<string>;
}

export default function Sidebar({
  parsedSteps,
  currentStep,
  pageIndexByStep,
  onNavigate,
  language,
  openChildStepIds,
}: SidebarProps) {
  const theme = useTheme();

  const flatPages: FlatSidebarPage[] = useMemo(
    () => buildFlatSidebarPages(parsedSteps, openChildStepIds),
    [parsedSteps, openChildStepIds]
  );

  if (!parsedSteps.length) return null;

  const rootStep = parsedSteps[0];
  const title =
    rootStep.title?.[language] ??
    rootStep.title?.["eng"] ??
    rootStep.names?.[language] ??
    rootStep.names?.["eng"] ??
    "Questionnaire";

  const activeStepIndex = StepIndexResolver.get(parsedSteps, currentStep.id);
  const activePageIndex = pageIndexByStep[currentStep.id] ?? 0;

  const resolveLabel = (p: FlatSidebarPage): string => {
    return (
      p.sidebarLabel?.[language] ??
      p.sidebarLabel?.["eng"] ??
      p.pageLabel?.[language] ??
      p.pageLabel?.["eng"] ??
      p.pageKey
    );
  };

  return (
    <nav
      className={styles.sidebar}
      style={{
        backgroundColor: theme.colors.blue[100],
        borderLeft: `1px solid ${theme.colors.grey[300]}`,
        fontFamily: theme.fonts.body,
      }}
    >
      <h2
        className="mb-4 text-xl font-semibold"
        style={{
          color: theme.colors.primary,
          fontFamily: theme.fonts.heading,
        }}
      >
        {title}
      </h2>
      <ul className="space-y-1">
        {flatPages.map((p) => {
          const isActive =
            p.stepIndex === activeStepIndex && p.pageIndex === activePageIndex;
          const buttonStyle = isActive
            ? {
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                fontFamily: theme.fonts.body,
                fontWeight: 500 as const,
              }
            : {
                backgroundColor: theme.colors.white,
                color: theme.colors.text,
                fontFamily: theme.fonts.body,
                fontWeight: 500 as const,
              };

          return (
            <motion.li
              key={`${p.stepId}::${p.pageKey}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ marginLeft: `${p.depth * INDENT_PX_PER_LEVEL}px` }}
            >
              <button
                type="button"
                onClick={() => onNavigate(p.stepIndex, p.pageIndex)}
                className="w-full rounded px-4 py-2 text-left text-sm transition-all"
                style={buttonStyle}
                aria-current={isActive ? "page" : undefined}
              >
                {resolveLabel(p)}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}
