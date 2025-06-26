import { Step } from "../../../type";
import { validateCurrentPageData } from "./validation";
import React, { useCallback } from "react";

export function useHandleNavigate(
  parsedSteps: Step[],
  currentStep: number,
  pageIndexByStep: Record<string, number>,
  setFieldErrors: (f: Record<string, string>) => void,
  formFieldRefs: React.MutableRefObject<
    Record<
      string,
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    >
  >,
  language: string,
  saveCurrentPageData: (updatedData?: Record<string, any>) => void,
  setCurrentStep: (s: number) => void,
  setVisitedSteps: (fn: (p: Set<string>) => Set<string>) => void
) {
  return useCallback(
    (targetStepIdx: number) => {
      if (targetStepIdx < 0 || targetStepIdx >= parsedSteps.length) return;

      if (
        !validateCurrentPageData(
          parsedSteps,
          currentStep,
          pageIndexByStep,
          language,
          formFieldRefs,
          setFieldErrors
        )
      ) {
        console.warn("Please fix errors before navigating.");
        // return
      }

      saveCurrentPageData();

      setCurrentStep(targetStepIdx);
      setVisitedSteps((prev) => {
        const updated = new Set(prev);
        updated.add(parsedSteps[targetStepIdx].id);
        return updated;
      });
    },
    [
      parsedSteps,
      currentStep,
      pageIndexByStep,
      language,
      formFieldRefs,
      setFieldErrors,
      saveCurrentPageData,
      setCurrentStep,
      setVisitedSteps,
    ]
  );
} 