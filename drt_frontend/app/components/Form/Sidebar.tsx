"use client";
import React from "react";
import { ParsedStep } from "./types";
import { NavigationItem } from "./NavigationItem";
import { useTheme } from "./hooks/useTheme";
import styles from "./Form.module.css";
import { StepIndexResolver } from "./domain/sidebar";

interface SidebarProps {
  parsedSteps: ParsedStep[];
  visitedSteps: Set<string>;
  currentStep: ParsedStep;
  pageIndexByStep: Record<string, number>;
  onNavigate: (stepIndex: number, pageIndex?: number) => void;
  language: string;
  expandedStep: string | null;
  setExpandedStep: (s: string | null) => void;
}

export default function Sidebar({
  parsedSteps,
  visitedSteps,
  currentStep,
  pageIndexByStep,
  onNavigate,
  language,
  expandedStep,
  setExpandedStep,
}: SidebarProps) {
  const theme = useTheme();

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
        style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
      >
        Pages / Steps
      </h2>
      <ul className="space-y-4">
        {parsedSteps
          .filter((s) => visitedSteps.has(s.id) || s.id === parsedSteps[0].id)
          .map((stepNode) => {
            const nodeStepIndex = StepIndexResolver.get(
              parsedSteps,
              stepNode.id
            );
            const nodeCurrentPageIndex = pageIndexByStep[stepNode.id] ?? 0;
            return (
              <NavigationItem
                key={stepNode.id}
                step={stepNode}
                currentStep={nodeStepIndex}
                currentPageIndex={nodeCurrentPageIndex}
                onNavigate={onNavigate}
                language={language}
                getIndex={(id) => StepIndexResolver.get(parsedSteps, id)}
                expandedStep={expandedStep}
                setExpandedStep={setExpandedStep}
              />
            );
          })}
      </ul>
    </nav>
  );
}
