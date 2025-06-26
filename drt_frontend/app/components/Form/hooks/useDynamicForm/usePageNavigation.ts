import { Step } from "../../../type";
import { getReferencingStep } from "../../utils/steps";
import { validateCurrentPageData } from "./validation";
import React, { useCallback } from "react";

export function usePageNavigation(
  parsedSteps: Step[],
  currentStep: number,
  pageIndexByStep: Record<string, number>,
  parentSteps: Step[],
  formFieldRefs: React.MutableRefObject<
    Record<
      string,
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    >
  >,
  language: string,
  saveCurrentPageData: (updatedData?: Record<string, any>) => void,
  setFieldErrors: (f: Record<string, string>) => void,
  setPageIndexByStep: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >,
  setCurrentStep: (s: number) => void,
  onNavigate: (idx: number) => void
) {
  const goToNextParent = useCallback(() => {
    const stepId = parsedSteps[currentStep]?.id;
    const currentParentIndex = parentSteps.findIndex((p) => p.id === stepId);
    if (
      currentParentIndex >= 0 &&
      currentParentIndex < parentSteps.length - 1
    ) {
      const nextParentId = parentSteps[currentParentIndex + 1].id;
      const nextIndex = parsedSteps.findIndex((s) => s.id === nextParentId);
      if (nextIndex >= 0) {
        onNavigate(nextIndex);
      }
    }
  }, [parsedSteps, currentStep, parentSteps, onNavigate]);

  const goToPreviousParent = useCallback(() => {
    const stepId = parsedSteps[currentStep]?.id;
    const currentParentIndex = parentSteps.findIndex((p) => p.id === stepId);
    if (currentParentIndex > 0) {
      const prevParentId = parentSteps[currentParentIndex - 1].id;
      const prevIndex = parsedSteps.findIndex((s) => s.id === prevParentId);
      if (prevIndex >= 0) onNavigate(prevIndex);
    }
  }, [parsedSteps, currentStep, parentSteps, onNavigate]);

  const isParentStep = useCallback(
    (step: Step) => parentSteps.some((p) => p.id === step.id),
    [parentSteps]
  );

  const handleNextPage = useCallback(() => {
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
      console.warn("Please fix errors before continuing.");
      // return
    }
    saveCurrentPageData();

    const currentStepObj = parsedSteps[currentStep];
    const currentPageIdx = pageIndexByStep[currentStepObj.id] ?? 0;
    const lastPageIdx = currentStepObj.pages.length - 1;

    if (currentPageIdx < lastPageIdx) {
      setPageIndexByStep((prev) => ({
        ...prev,
        [currentStepObj.id]: currentPageIdx + 1,
      }));
    } else {
      if (isParentStep(currentStepObj)) {
        goToNextParent();
        const newIdx = currentStep + 1;
        if (newIdx < parsedSteps.length) {
          setPageIndexByStep((prev) => ({
            ...prev,
            [parsedSteps[newIdx].id]: 0,
          }));
        }
      }
    }
  }, [
    parsedSteps,
    currentStep,
    pageIndexByStep,
    language,
    formFieldRefs,
    setFieldErrors,
    saveCurrentPageData,
    isParentStep,
    goToNextParent,
  ]);

  const handlePreviousPage = useCallback(() => {
    saveCurrentPageData();

    const currentStepObj = parsedSteps[currentStep];
    const currentPageIdx = pageIndexByStep[currentStepObj.id] ?? 0;

    if (currentPageIdx > 0) {
      setPageIndexByStep((prev) => ({
        ...prev,
        [currentStepObj.id]: currentPageIdx - 1,
      }));
    } else {
      if (isParentStep(currentStepObj)) {
        goToPreviousParent();
        const newIdx = currentStep - 1;
        if (newIdx >= 0) {
          const prevStep = parsedSteps[newIdx];
          setPageIndexByStep((prev) => ({
            ...prev,
            [prevStep.id]: prevStep.pages.length - 1 || 0,
          }));
        }
      }
    }
  }, [
    parsedSteps,
    currentStep,
    pageIndexByStep,
    saveCurrentPageData,
    isParentStep,
    goToPreviousParent,
  ]);

  const finishHandler = useCallback(() => {
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
      console.warn("Please fix errors before continuing.");
      // return
    }
    saveCurrentPageData();

    const stepObj = parsedSteps[currentStep];
    if (!stepObj) return;

    if (!isParentStep(stepObj)) {
      // If finishing a child step, remove from visited set so sidebar collapses it
      // (note: parent code should handle that via context or props)
    }

    const referencingStep = getReferencingStep(stepObj.id, parsedSteps);
    if (referencingStep) {
      const refIdx = parsedSteps.findIndex((s) => s.id === referencingStep.id);
      setCurrentStep(refIdx);
    } else {
      setCurrentStep(0);
    }
  }, [
    parsedSteps,
    currentStep,
    pageIndexByStep,
    language,
    formFieldRefs,
    setFieldErrors,
    saveCurrentPageData,
    isParentStep,
  ]);

  const cancelHandler = useCallback(() => {
    saveCurrentPageData();
    setCurrentStep(0);
  }, [saveCurrentPageData, setCurrentStep]);

  return {
    handleNextPage,
    handlePreviousPage,
    finishHandler,
    cancelHandler,
    isParentStep,
  };
} 