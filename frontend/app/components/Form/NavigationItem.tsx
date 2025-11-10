import React from "react";
import { motion } from "framer-motion";
import { ParsedStep } from "./types";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useTheme } from "./hooks/useTheme";

interface NavigationItemProps {
  step: ParsedStep;
  currentStep: number;
  currentPageIndex: number;
  onNavigate: (stepIndex: number, pageIndex?: number) => void;
  language: string;
  getIndex: (stepId: string) => number;
  expandedStep: string | null;
  setExpandedStep: (stepId: string | null) => void;
}

export const NavigationItem = React.memo(function NavigationItem({
  step,
  currentStep,
  currentPageIndex,
  onNavigate,
  language,
  getIndex,
  expandedStep,
  setExpandedStep,
}: NavigationItemProps) {
  const theme = useTheme();
  const stepIndex = getIndex(step.id);
  const isExpanded = expandedStep === step.id;
  const isActiveStep = currentStep === stepIndex;

  const stepButtonStyle = isActiveStep
    ? {
        backgroundColor: theme.colors.primary,
        color: theme.colors.white,
        fontFamily: theme.fonts.body,
        fontWeight: "500",
      }
    : {
        backgroundColor: theme.colors.grey[200],
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
        fontWeight: "500",
      };

  const pageButtonStyle = (isActivePage: boolean) => ({
    backgroundColor: isActivePage ? theme.colors.primary : theme.colors.white,
    color: isActivePage ? theme.colors.white : theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: "0.875rem",
  });

  return (
    <li className="mb-2">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
        className="flex w-full items-center justify-between rounded px-4 py-2 text-left transition-all"
        style={stepButtonStyle}
        aria-expanded={isExpanded}
        aria-controls={`submenu-${step.id}`}
      >
        <span>
          {step.sidebar_label?.[language] ||
            step.names[language] ||
            step.names["eng"]}
        </span>
        {step.pages.length > 1 && (
          <motion.div
            animate={{ rotate: isExpanded ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isExpanded ? (
              <FiChevronDown size={18} />
            ) : (
              <FiChevronRight size={18} />
            )}
          </motion.div>
        )}
      </motion.button>

      {isExpanded && (
        <ul id={`submenu-${step.id}`} className="ml-4 mt-2 space-y-1">
          {step.pages.map((page, pageIndex) => {
            const isActivePage = isActiveStep && currentPageIndex === pageIndex;
            return (
              <motion.li
                key={page.pageKey}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(stepIndex, pageIndex);
                  }}
                  className="w-full rounded px-4 py-2 text-left transition-all"
                  style={pageButtonStyle(isActivePage)}
                >
                  {page.sidebar_label?.[language] ??
                    page.sidebar_label?.["eng"] ??
                    ""}
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </li>
  );
});
