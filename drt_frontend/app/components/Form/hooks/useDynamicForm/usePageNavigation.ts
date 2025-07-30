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
  onNavigate: (idx: number) => void,
  // Additional parameters for enhanced functionality
  setVisitedSteps?: React.Dispatch<React.SetStateAction<Set<string>>>,
  setCurrentChildId?: (id: string | null) => void,
  setCurrentChildParentId?: (id: string | null) => void,
  currentChildId?: string | null,
  currentChildParentId?: string | null
) {
  const goToNextParent = useCallback(() => {
    if (!validateCurrentPageData(
      parsedSteps,
      currentStep,
      pageIndexByStep,
      language,
      formFieldRefs,
      setFieldErrors
    )) {
      console.warn("Please fix errors before continuing.");
      // return
    }

    saveCurrentPageData();
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
  }, [parsedSteps, currentStep, parentSteps, onNavigate, pageIndexByStep, language, formFieldRefs, setFieldErrors, saveCurrentPageData]);

  const goToPreviousParent = useCallback(() => {
    if (!validateCurrentPageData(
      parsedSteps,
      currentStep,
      pageIndexByStep,
      language,
      formFieldRefs,
      setFieldErrors
    )) {
      console.warn("Please fix errors before continuing.");
      // return
    }
    
    saveCurrentPageData();
    const stepId = parsedSteps[currentStep]?.id;
    const currentParentIndex = parentSteps.findIndex((p) => p.id === stepId);
    if (currentParentIndex > 0) {
      const prevParentId = parentSteps[currentParentIndex - 1].id;
      const prevIndex = parsedSteps.findIndex((s) => s.id === prevParentId);
      if (prevIndex >= 0) onNavigate(prevIndex);
    }
  }, [parsedSteps, currentStep, parentSteps, onNavigate, pageIndexByStep, language, formFieldRefs, setFieldErrors, saveCurrentPageData]);

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
      // If it's a child step on the last page, do nothing here
      // (the user sees Finish/Cancel).
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
      // If child step is on first page, do nothing
      // (the user does not have a "Back" on the first child page).
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
      if (setVisitedSteps) {
        setVisitedSteps(prev => {
          const updated = new Set(prev);
          updated.delete(stepObj.id);
          return updated;
        });
      }
    }

    // Reset child state when finishing
    if (setCurrentChildId) {
      setCurrentChildId(null);
    }
    if (setCurrentChildParentId) {
      setCurrentChildParentId(null);
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
    setVisitedSteps,
    setCurrentChildId,
    setCurrentChildParentId,
  ]);

  const cancelHandler = useCallback(() => {
    saveCurrentPageData();
    
    // Reset child state when canceling
    if (setCurrentChildId) {
      setCurrentChildId(null);
    }
    if (setCurrentChildParentId) {
      setCurrentChildParentId(null);
    }
    
    setCurrentStep(0);
  }, [saveCurrentPageData, setCurrentStep, setCurrentChildId, setCurrentChildParentId]);

  // Enhanced navigation function for direct step/page navigation
  const handleNavigate = useCallback(
    (stepIndex: number, pageIndex: number = 0) => {
      if (stepIndex < 0 || stepIndex >= parsedSteps.length) return;

      if (!validateCurrentPageData(
        parsedSteps,
        currentStep,
        pageIndexByStep,
        language,
        formFieldRefs,
        setFieldErrors
      )) {
        console.warn("Please fix errors before continuing.");
        // return
      }

      saveCurrentPageData();

      setPageIndexByStep(prev => ({
        ...prev,
        [parsedSteps[stepIndex].id]: pageIndex
      }));

      onNavigate(stepIndex);
    },
    [parsedSteps, currentStep, pageIndexByStep, language, formFieldRefs, setFieldErrors, saveCurrentPageData, onNavigate]
  );

  return {
    handleNextPage,
    handlePreviousPage,
    finishHandler,
    cancelHandler,
    isParentStep,
    handleNavigate,
    goToNextParent,
    goToPreviousParent,
  };
} 