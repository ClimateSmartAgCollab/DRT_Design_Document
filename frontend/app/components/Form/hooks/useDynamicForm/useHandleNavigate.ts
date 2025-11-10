// drt_frontend/app/components/Form/hooks/useDynamicForm/useHandleNavigate.ts
import React, { useCallback } from "react";
import type { Step } from "../../../type";
import { validateCurrentPageData } from "./validation";

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
  const validateGate = useCallback(() => {
    const ok = validateCurrentPageData(
      parsedSteps,
      currentStep,
      pageIndexByStep,
      language,
      formFieldRefs,
      setFieldErrors
    );
    if (!ok) console.warn("Please fix errors before navigating.");
    return ok;
  }, [
    parsedSteps,
    currentStep,
    pageIndexByStep,
    language,
    formFieldRefs,
    setFieldErrors,
  ]);

  return useCallback(
    (targetStepIdx: number) => {
      if (targetStepIdx < 0 || targetStepIdx >= parsedSteps.length) return;
      if (!validateGate()) return;

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
      validateGate,
      saveCurrentPageData,
      setCurrentStep,
      setVisitedSteps,
    ]
  );
}
