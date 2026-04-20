// drt_frontend/app/components/Form/hooks/useDynamicForm/usePageNavigation.ts
import React, { useCallback, useMemo } from "react";
import type { Step } from "../../../type";
import { validateCurrentPageData } from "./validation";
import { NavigationService } from "../../domain/navigation";

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
  // optional params (child lifecycle)
  setVisitedSteps?: React.Dispatch<React.SetStateAction<Set<string>>>,
  setCurrentChildId?: (id: string | null) => void,
  setCurrentChildParentId?: (id: string | null) => void,
  currentChildId?: string | null,
  currentChildParentId?: string | null,
  deleteChild?: (
    childId: string,
    parentId: string,
    childStepId: string
  ) => void,
  isNewChild?: boolean,
  removeChildStepWithDescendants?: (stepId: string) => void
) {
  const nav = useMemo(
    () => new NavigationService<Step>(parsedSteps, parentSteps),
    [parsedSteps, parentSteps]
  );

  const validateGate = useCallback(() => {
    const ok = validateCurrentPageData(
      parsedSteps,
      currentStep,
      pageIndexByStep,
      language,
      formFieldRefs,
      setFieldErrors
    );
    if (!ok) console.warn("Please fix errors before continuing.");
    return ok;
  }, [
    parsedSteps,
    currentStep,
    pageIndexByStep,
    language,
    formFieldRefs,
    setFieldErrors,
  ]);

  const goToNextParent = useCallback(() => {
    if (!validateGate()) return;
    saveCurrentPageData();

    const nextParentIndex = nav.nextParentIndexFrom(currentStep);
    if (nextParentIndex >= 0) {
      onNavigate(nextParentIndex);
      setPageIndexByStep((prev) => ({
        ...prev,
        [parsedSteps[nextParentIndex].id]: 0,
      }));
    }
  }, [
    validateGate,
    saveCurrentPageData,
    nav,
    currentStep,
    onNavigate,
    setPageIndexByStep,
    parsedSteps,
  ]);

  const goToPreviousParent = useCallback(() => {
    if (!validateGate()) return;
    saveCurrentPageData();

    const prevParentIndex = nav.prevParentIndexFrom(currentStep);
    if (prevParentIndex >= 0) {
      onNavigate(prevParentIndex);
      const last = Math.max(
        (parsedSteps[prevParentIndex].pages?.length ?? 1) - 1,
        0
      );
      setPageIndexByStep((prev) => ({
        ...prev,
        [parsedSteps[prevParentIndex].id]: last,
      }));
    }
  }, [
    validateGate,
    saveCurrentPageData,
    nav,
    currentStep,
    onNavigate,
    setPageIndexByStep,
    parsedSteps,
  ]);

  const isParentStep = useCallback(
    (step: Step) => nav.isParentStep(step),
    [nav]
  );

  const handleNextPage = useCallback(() => {
    if (!validateGate()) return;
    saveCurrentPageData();

    const res = nav.nextPageOrParent(currentStep, pageIndexByStep);
    if (res) {
      if (res.stepIndex !== currentStep) {
        onNavigate(res.stepIndex);
      }
      setPageIndexByStep((prev) => ({
        ...prev,
        [parsedSteps[res.stepIndex].id]: res.pageIndex,
      }));
    }
  }, [
    validateGate,
    saveCurrentPageData,
    nav,
    currentStep,
    pageIndexByStep,
    onNavigate,
    setPageIndexByStep,
    parsedSteps,
  ]);

  const handlePreviousPage = useCallback(() => {
    saveCurrentPageData();

    const res = nav.prevPageOrParent(currentStep, pageIndexByStep);
    if (res) {
      if (res.stepIndex !== currentStep) {
        onNavigate(res.stepIndex);
      }
      setPageIndexByStep((prev) => ({
        ...prev,
        [parsedSteps[res.stepIndex].id]: res.pageIndex,
      }));
    }
  }, [
    saveCurrentPageData,
    nav,
    currentStep,
    pageIndexByStep,
    onNavigate,
    setPageIndexByStep,
    parsedSteps,
  ]);

  const finishHandler = useCallback(() => {
    if (!validateGate()) return;
    saveCurrentPageData();

    const stepObj = parsedSteps[currentStep];
    if (!stepObj) return;

    if (!nav.isParentStep(stepObj)) {
      setVisitedSteps?.((prev) => {
        const updated = new Set(prev);
        updated.delete(stepObj.id);
        return updated;
      });
    }

    setCurrentChildId?.(null);
    setCurrentChildParentId?.(null);
    removeChildStepWithDescendants?.(stepObj.id);

    const refIdx = nav.referencingStepIndex(stepObj.id);
    setCurrentStep(refIdx >= 0 ? refIdx : 0);
  }, [
    validateGate,
    saveCurrentPageData,
    parsedSteps,
    currentStep,
    nav,
    setVisitedSteps,
    setCurrentChildId,
    setCurrentChildParentId,
    setCurrentStep,
    removeChildStepWithDescendants,
  ]);

  const cancelHandler = useCallback(() => {
    const stepObj = parsedSteps[currentStep];
    if (currentChildId && currentChildParentId && isNewChild && deleteChild) {
      if (stepObj)
        deleteChild(currentChildId, currentChildParentId, stepObj.id);
    }
    if (stepObj) removeChildStepWithDescendants?.(stepObj.id);
    setCurrentChildId?.(null);
    setCurrentChildParentId?.(null);
    setCurrentStep(0);
  }, [
    currentChildId,
    currentChildParentId,
    isNewChild,
    deleteChild,
    parsedSteps,
    currentStep,
    setCurrentStep,
    setCurrentChildId,
    setCurrentChildParentId,
    removeChildStepWithDescendants,
  ]);

  const handleNavigate = useCallback(
    (stepIndex: number, pageIndex: number = 0) => {
      if (stepIndex < 0 || stepIndex >= parsedSteps.length) return;
      if (!validateGate()) return;

      saveCurrentPageData();
      setPageIndexByStep((prev) => ({
        ...prev,
        [parsedSteps[stepIndex].id]: pageIndex,
      }));
      onNavigate(stepIndex);
    },
    [
      parsedSteps,
      validateGate,
      saveCurrentPageData,
      setPageIndexByStep,
      onNavigate,
    ]
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
