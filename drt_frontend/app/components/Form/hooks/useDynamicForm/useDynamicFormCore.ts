// drt_frontend\app\components\Form\hooks\useDynamicForm\useDynamicFormCore.ts

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Step, Page_parsed, Field } from "../../../type";
import { getParentSteps } from "../../utils/steps";
import { useFormData } from "../../context/FormDataContext";

import { isValid__UTF8 } from "./utils";
import { validateCurrentPageData, validateField } from "./validation";
import { useHandleNavigate, usePageNavigation } from "../useDynamicForm";
import { useSubmissionMapping } from "./mapping";

// The main hook. Returns all values/functions needed by FormWrapper.
export function useDynamicForm(parsedSteps: Step[]) {
  // Safety check: ensure we have valid parsedSteps
  if (!parsedSteps || parsedSteps.length === 0) {
    console.warn("useDynamicForm: No valid parsedSteps provided");
    return {
      language: "en",
      setLanguage: () => {},
      currentStep: 0,
      visitedSteps: new Set<string>(),
      formData: {},
      setFormData: () => {},
      parentSteps: [],
      onNavigate: () => {},
      finishHandler: () => {},
      cancelHandler: () => {},
      isParentStep: () => false,
      setCurrentChildId: () => {},
      currentChildId: null,
      setCurrentChildParentId: () => {},
      currentChildParentId: null,
      createNewChild: () => ({ id: "", data: {} }),
      pageIndexByStep: {},
      expandedStep: null,
      setExpandedStep: () => {},
      handleNavigate: () => {},
      handleNextPage: () => {},
      handlePreviousPage: () => {},
      goToNextParent: () => {},
      goToPreviousParent: () => {},
      isVeryLastPageOfLastStep: false,
      currentPage: undefined,
      isLastPageOfThisStep: false,
      isFirstPageOfThisStep: true,
      step: undefined,
      handleFieldChange: () => {},
      registerFieldRef: () => {},
      editExistingChild: () => undefined,
      deleteChild: () => {},
      reviewOutput: false,
      setReviewOutput: () => {},
      handleSubmit_openAIRE: () => {},
      isNewChild: false,
      setIsNewChild: () => {},
      prefillCurrentPageData: () => {},
      fieldErrors: {},
    };
  }

  const [language, setLanguage] = useState("eng");
  const [currentStep, setCurrentStep] = useState(0);
  const [pageIndexByStep, setPageIndexByStep] = useState<
    Record<string, number>
  >(() => {
    return parsedSteps.reduce((acc, step) => {
      acc[step.id] = 0;
      return acc;
    }, {} as Record<string, number>);
  });

  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(
    new Set([parsedSteps[0]?.id])
  );
  const [currentChildParentId, setCurrentChildParentId] = useState<
    string | null
  >(null);

  // Load initial state from sessionStorage (or {} on server-side)
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (typeof window === "undefined") return {};
    const saved = sessionStorage.getItem("formData");
    return saved ? JSON.parse(saved) : {};
  });
  
  // Write back on every change, but only if formData is not empty
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

  const parentSteps = useMemo(() => getParentSteps(parsedSteps), [parsedSteps]);

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
      // Normalize value
      const normalizedValue =
        typeof newValue === "string" ? newValue.normalize("NFC") : newValue;
      if (
        typeof normalizedValue === "string" &&
        !isValid__UTF8(normalizedValue)
      ) {
        console.warn(`Invalid UTF-8 in field "${field.id}".`);
      }

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

      // Field-level validation for just this field
      const errorMsg = validateField(field, normalizedValue, language) || "";

      setFieldErrors((prev) => ({
        ...prev,
        [field.id]: errorMsg,
      }));
    },
    [
      parsedSteps,
      currentStep,
      pageIndexByStep,
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
    handleSubmit_openAIRE,
    handleVerifyAndSubmit,
  } = useSubmissionMapping(parsedSteps, formData, parentFormData, language);

  // Prefill DOM elements with stored data whenever step or page changes
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

    // Clear all form fields first to prevent data persistence
    currentPage.sections.forEach((section) => {
      section.fields.forEach((field: Field) => {
        const element = formFieldRefs.current[field.id];
        if (!element) return;

        if (field.type === "select" || field.type === "dropdown") {
          if (element instanceof HTMLInputElement && element.type === "checkbox") {
            const checkboxes = document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name='${element.name}']`);
            checkboxes.forEach((cb) => {
              cb.checked = false;
            });
          } else if (element instanceof HTMLSelectElement) {
            const selectEl = element as HTMLSelectElement;
            Array.from(selectEl.options).forEach((opt) => {
              opt.selected = false;
            });
          }
        } else {
          const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
          inputEl.value = "";
        }
      });
    });

    // Now set the correct values
    currentPage.sections.forEach((section) => {
      section.fields.forEach((field: Field) => {
        const fieldValue = stepData[field.id] || "";
        const element = formFieldRefs.current[field.id];
        if (!element) return;

        if (field.type === "select" || field.type === "dropdown") {
          if (element instanceof HTMLInputElement && element.type === "checkbox") {
            const checkboxes = document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name='${element.name}']`);
            const storedValues = Array.isArray(fieldValue)
              ? (fieldValue as string[])
              : [fieldValue];
            checkboxes.forEach((cb) => {
              cb.checked = storedValues.includes(cb.value);
            });
          } else if (element instanceof HTMLSelectElement) {
            const selectEl = element as HTMLSelectElement;
            const storedValues = Array.isArray(fieldValue)
              ? (fieldValue as string[])
              : [fieldValue];
            Array.from(selectEl.options).forEach((opt) => {
              opt.selected = storedValues.includes(opt.value);
            });
          }
        } else {
          const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
          inputEl.value = fieldValue;
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

  // Clear current step form data
  const clearCurrentStepFormData = useCallback(() => {
    const stepObj = parsedSteps[currentStep];
    if (!stepObj) return;

    const currentPageIdx = pageIndexByStep[stepObj.id] ?? 0;
    const currentPage: Page_parsed | undefined = stepObj.pages[currentPageIdx];
    if (!currentPage) return;

    // Clear all form fields
    currentPage.sections.forEach((section) => {
      section.fields.forEach((field: Field) => {
        const element = formFieldRefs.current[field.id];
        if (!element) return;

        if (field.type === "select" || field.type === "dropdown") {
          if (element instanceof HTMLInputElement && element.type === "checkbox") {
            const checkboxes = document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name='${element.name}']`);
            checkboxes.forEach((cb) => {
              cb.checked = false;
            });
          } else if (element instanceof HTMLSelectElement) {
            const selectEl = element as HTMLSelectElement;
            Array.from(selectEl.options).forEach((opt) => {
              opt.selected = false;
            });
          }
        } else {
          const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
          inputEl.value = "";
        }
      });
    });
  }, [parsedSteps, currentStep, pageIndexByStep]);

  // Clear and refill form data when switching between children
  useEffect(() => {
    if (currentChildId !== null || currentChildParentId !== null) {
      prefillCurrentPageData();
    }
  }, [currentChildId, currentChildParentId, prefillCurrentPageData]);

  // Clear form data when child ID changes to prevent data persistence
  useEffect(() => {
    if (currentChildId !== null) {
      clearCurrentStepFormData();
      setTimeout(() => {
        prefillCurrentPageData();
      }, 0);
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
    isFirstPageOfThisStep:
      pageIndexByStep[parsedSteps[currentStep]?.id] === 0,
    step: parsedSteps[currentStep],
    saveCurrentPageData,
    fieldErrors,
    handleFieldChange,
    registerFieldRef,
    sortStepsByReferences: () => {},
    reviewOutput: reviewData,
    setReviewOutput: setReviewData,
    handleSubmit_openAIRE,
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
