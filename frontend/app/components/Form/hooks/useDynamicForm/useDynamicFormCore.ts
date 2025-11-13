// drt_frontend/app/components/Form/hooks/useDynamicForm/useDynamicFormCore.ts
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { Step, Page_parsed, Field } from "../../../type";
import { useFormData } from "../../context/FormDataContext";
import { validateField } from "./validation";
import { useHandleNavigate, usePageNavigation } from "../useDynamicForm";
import { useSubmissionMapping } from "./mapping";
import { StepTreeBuilder } from "../../domain/step-tree";

// The main hook. Returns all values/functions needed by FormWrapper.
export function useDynamicForm(parsedSteps: Step[] = []) {
  if (parsedSteps.length === 0) {
    console.warn("useDynamicForm: No valid parsedSteps provided");
  }

  const [language, setLanguage] = useState("eng");
  const [currentStep, setCurrentStep] = useState(0);
  const [pageIndexByStep, setPageIndexByStep] = useState<
    Record<string, number>
  >(() =>
    parsedSteps.reduce((acc, step) => {
      acc[step.id] = 0;
      return acc;
    }, {} as Record<string, number>)
  );

  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([parsedSteps[0]?.id])
  );
  const [currentChildParentId, setCurrentChildParentId] = useState<
    string | null
  >(null);

  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (typeof window === "undefined") return {};
    const saved = sessionStorage.getItem("formData");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(formData).length > 0) {
      sessionStorage.setItem("formData", JSON.stringify(formData));
    }
  }, [formData]);

  const [currentChildId, setCurrentChildId] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(
    parsedSteps[0]?.id || null
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isNewChild, setIsNewChild] = useState(false);

  const {
    createNewChild,
    editExistingChild,
    saveChildData,
    parentFormData,
    deleteChild,
    updateChildById,
  } = useFormData();

  const parentSteps = useMemo(
    () => new StepTreeBuilder<Step>(parsedSteps).getParentSteps(),
    [parsedSteps]
  );

  const formFieldRefs = useRef<
    Record<
      string,
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    >
  >({});

  const registerFieldRef = useCallback(
    (
      fieldId: string,
      element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
    ) => {
      formFieldRefs.current[fieldId] = element;
    },
    []
  );

  const handleFieldChange = useCallback(
    (field: Field, newValue: string | string[]) => {
      const normalizedValue =
        typeof newValue === "string" ? newValue.normalize("NFC") : newValue;

      if (currentChildId && currentChildParentId) {
        updateChildById(currentChildParentId, currentChildId, {
          [field.id]: normalizedValue,
        });
      } else {
        const stepObj = parsedSteps[currentStep];
        if (!stepObj) return;
        const stepId = stepObj.id;
        setFormData((prev) => ({
          ...prev,
          [stepId]: {
            ...(prev[stepId] || {}),
            [field.id]: normalizedValue,
          },
        }));
      }

      const errorMsg = validateField(field, normalizedValue, language) || "";
      setFieldErrors((prev) => ({ ...prev, [field.id]: errorMsg }));
    },
    [
      parsedSteps,
      currentStep,
      language,
      currentChildId,
      currentChildParentId,
      updateChildById,
    ]
  );

  const saveCurrentPageData = useCallback(
    (updatedData?: Record<string, any>) => {
      const stepObj = parsedSteps[currentStep];
      if (!stepObj) return;

      const currentPageIdx = pageIndexByStep[stepObj.id] ?? 0;
      const currentPage: Page_parsed | undefined =
        stepObj.pages[currentPageIdx];
      if (!currentPage) return;

      const existingData = formData[stepObj.id] || {};
      const finalData = { ...existingData, ...(updatedData || {}) };

      setFormData((prev) => ({
        ...prev,
        [stepObj.id]: {
          ...prev[stepObj.id],
          ...finalData,
        },
      }));

      if (currentChildId && currentChildParentId) {
        try {
          saveChildData(currentChildParentId, currentChildId, finalData);
        } catch (err) {
          console.error("Error saving child data:", err);
        }
      }
    },
    [
      parsedSteps,
      currentStep,
      pageIndexByStep,
      formData,
      currentChildId,
      currentChildParentId,
      saveChildData,
    ]
  );

  const onNavigate = useHandleNavigate(
    parsedSteps,
    currentStep,
    pageIndexByStep,
    (errs: any) => setFieldErrors(errs),
    formFieldRefs,
    language,
    saveCurrentPageData,
    (idx: any) => setCurrentStep(idx),
    (fn: any) => setVisitedSteps(fn)
  );

  const {
    handleNextPage,
    handlePreviousPage,
    finishHandler,
    cancelHandler,
    isParentStep,
    handleNavigate,
    goToNextParent,
    goToPreviousParent,
  } = usePageNavigation(
    parsedSteps,
    currentStep,
    pageIndexByStep,
    parentSteps,
    formFieldRefs,
    language,
    saveCurrentPageData,
    (errs: any) => setFieldErrors(errs),
    (newMap: any) => setPageIndexByStep(newMap),
    (idx: any) => setCurrentStep(idx),
    onNavigate,
    setVisitedSteps,
    setCurrentChildId,
    setCurrentChildParentId,
    currentChildId,
    currentChildParentId,
    deleteChild,
    isNewChild
  );

  const {
    reviewOutput: reviewData,
    setReviewOutput: setReviewData,
    handleSubmit,
    handleVerifyAndSubmit,
  } = useSubmissionMapping(parsedSteps, formData, parentFormData, language);

  // Prefill / clear helpers (unchanged)
  const prefillCurrentPageData = useCallback(() => {
    const stepObj = parsedSteps[currentStep];
    if (!stepObj) return;

    const currentPageIdx = pageIndexByStep[stepObj.id] ?? 0;
    const currentPage: Page_parsed | undefined = stepObj.pages[currentPageIdx];
    if (!currentPage) return;

    let stepData: Record<string, any> = {};
    if (currentChildId) {
      const child =
        currentChildParentId &&
        editExistingChild(currentChildParentId, currentChildId);
      stepData = child ? child.data : {};
    } else {
      stepData = formData[stepObj.id] || {};
    }

    // Clear
    currentPage.sections.forEach((section) => {
      section.fields.forEach((field: Field) => {
        const element = formFieldRefs.current[field.id];
        if (!element) return;
        if (
          (field.type === "select" || field.type === "dropdown") &&
          element instanceof HTMLInputElement &&
          element.type === "checkbox"
        ) {
          const checkboxes = document.querySelectorAll<HTMLInputElement>(
            `input[type=checkbox][name='${element.name}']`
          );
          checkboxes.forEach((cb) => (cb.checked = false));
        } else if (
          (field.type === "select" || field.type === "dropdown") &&
          element instanceof HTMLSelectElement
        ) {
          const selectEl = element as HTMLSelectElement;
          Array.from(selectEl.options).forEach((opt) => (opt.selected = false));
        } else {
          (element as HTMLInputElement | HTMLTextAreaElement).value = "";
        }
      });
    });

    // Fill
    currentPage.sections.forEach((section) => {
      section.fields.forEach((field: Field) => {
        const value = stepData[field.id] ?? "";
        const element = formFieldRefs.current[field.id];
        if (!element) return;

        if (
          (field.type === "select" || field.type === "dropdown") &&
          element instanceof HTMLInputElement &&
          element.type === "checkbox"
        ) {
          const checkboxes = document.querySelectorAll<HTMLInputElement>(
            `input[type=checkbox][name='${element.name}']`
          );
          const values = Array.isArray(value) ? (value as string[]) : [value];
          checkboxes.forEach((cb) => (cb.checked = values.includes(cb.value)));
        } else if (
          (field.type === "select" || field.type === "dropdown") &&
          element instanceof HTMLSelectElement
        ) {
          const selectEl = element as HTMLSelectElement;
          const values = Array.isArray(value) ? (value as string[]) : [value];
          Array.from(selectEl.options).forEach(
            (opt) => (opt.selected = values.includes(opt.value))
          );
        } else {
          (element as HTMLInputElement | HTMLTextAreaElement).value = value;
        }
      });
    });
  }, [
    parsedSteps,
    currentStep,
    pageIndexByStep,
    formData,
    currentChildId,
    currentChildParentId,
    editExistingChild,
  ]);

  const clearCurrentStepFormData = useCallback(() => {
    const stepObj = parsedSteps[currentStep];
    if (!stepObj) return;
    const currentPageIdx = pageIndexByStep[stepObj.id] ?? 0;
    const currentPage: Page_parsed | undefined = stepObj.pages[currentPageIdx];
    if (!currentPage) return;

    currentPage.sections.forEach((section) => {
      section.fields.forEach((field: Field) => {
        const element = formFieldRefs.current[field.id];
        if (!element) return;

        if (
          (field.type === "select" || field.type === "dropdown") &&
          element instanceof HTMLInputElement &&
          element.type === "checkbox"
        ) {
          const checkboxes = document.querySelectorAll<HTMLInputElement>(
            `input[type=checkbox][name='${element.name}']`
          );
          checkboxes.forEach((cb) => (cb.checked = false));
        } else if (
          (field.type === "select" || field.type === "dropdown") &&
          element instanceof HTMLSelectElement
        ) {
          const selectEl = element as HTMLSelectElement;
          Array.from(selectEl.options).forEach((opt) => (opt.selected = false));
        } else {
          (element as HTMLInputElement | HTMLTextAreaElement).value = "";
        }
      });
    });
  }, [parsedSteps, currentStep, pageIndexByStep]);

  useEffect(() => {
    if (currentChildId !== null || currentChildParentId !== null) {
      prefillCurrentPageData();
    }
  }, [currentChildId, currentChildParentId, prefillCurrentPageData]);

  useEffect(() => {
    if (currentChildId !== null) {
      clearCurrentStepFormData();
      setTimeout(() => prefillCurrentPageData(), 0);
    }
  }, [currentChildId, clearCurrentStepFormData, prefillCurrentPageData]);

  const [debugMode, setDebugMode] = useState(false);

  const resetForm = () => {
    setFormData({});
    setCurrentStep(0);
    setVisitedSteps(new Set([parsedSteps[0]?.id]));
  };

  return {
    language,
    setLanguage,
    currentStep,
    visitedSteps,
    formData,
    setFormData,
    parentSteps,
    onNavigate,
    finishHandler,
    cancelHandler,
    isParentStep,
    setCurrentChildId,
    currentChildId,
    setCurrentChildParentId,
    currentChildParentId,
    createNewChild,
    pageIndexByStep,
    expandedStep,
    setExpandedStep,
    handleNavigate,
    handleNextPage,
    handlePreviousPage,
    goToNextParent,
    goToPreviousParent,
    isVeryLastPageOfLastStep:
      isParentStep(parsedSteps[currentStep]) &&
      pageIndexByStep[parsedSteps[currentStep]?.id] ===
        parsedSteps[currentStep]?.pages.length - 1,
    currentPage:
      parsedSteps[currentStep]?.pages[
        pageIndexByStep[parsedSteps[currentStep]?.id] ?? 0
      ],
    isLastPageOfThisStep:
      parsedSteps[currentStep] &&
      pageIndexByStep[parsedSteps[currentStep]?.id] ===
        parsedSteps[currentStep]?.pages.length - 1,
    isFirstPageOfThisStep: pageIndexByStep[parsedSteps[currentStep]?.id] === 0,
    step: parsedSteps[currentStep],
    saveCurrentPageData,
    fieldErrors,
    handleFieldChange,
    registerFieldRef,
    sortStepsByReferences: () => {},
    reviewOutput: reviewData,
    setReviewOutput: setReviewData,
    handleSubmit,
    deleteChild,
    isNewChild,
    setIsNewChild,
    editExistingChild,
    handleVerifyAndSubmit,
    prefillCurrentPageData,
    clearCurrentStepFormData,
    debugMode,
    setDebugMode,
    resetForm,
  };
}
