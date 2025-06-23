// drt_frontend\app\components\Form\Sidebar.tsx
"use client";

import React from "react";
import { ParsedStep } from "./types";
import { NavigationItem } from "./NavigationItem";
import { getStepIndex } from "./utils";
import styles from "./Form.module.css";

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
  return (
    <nav className={styles.sidebar}>
      <h2 className="mb-4 text-xl font-semibold">Pages / Steps</h2>
      <ul className="space-y-4">
        {parsedSteps
          .filter((s) => visitedSteps.has(s.id) || s.id === parsedSteps[0].id)
          .map((stepNode) => {
            const nodeStepIndex = getStepIndex(parsedSteps, stepNode.id);
            const nodeCurrentPageIndex = pageIndexByStep[stepNode.id] ?? 0;

            return (
              <NavigationItem
                key={stepNode.id}
                step={stepNode}
                currentStep={nodeStepIndex}
                currentPageIndex={nodeCurrentPageIndex}
                onNavigate={onNavigate}
                language={language}
                getIndex={(id) => getStepIndex(parsedSteps, id)}
                expandedStep={expandedStep}
                setExpandedStep={setExpandedStep}
              />
            );
          })}
      </ul>
    </nav>
  );
}
