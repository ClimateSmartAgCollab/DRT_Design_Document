"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion } from "framer-motion";

import { parseJsonToFormStructure } from "../parser";
import type { ParsedStep, FormProps, UseDynamicFormReturn } from "./types";
import { useDynamicForm } from "../Form/hooks/useDynamicForm";
import { useFormData } from "../Form/context/FormDataContext";
import { buildValidationSchema } from "./hooks/useDynamicForm/validationSchema";
import { useTheme } from "./hooks/useTheme";

import FormHeader from "./FormHeader";
import FieldRenderer from "./FieldRenderer";
import NavigationButtons from "./NavigationButtons";
import Sidebar from "./Sidebar";
import ReviewSection from "./ReviewSection";
import styles from "./Form.module.css";
import Footer from "../Footer/footer";
import { SubheadingFormatter } from "./domain/subheading";

interface FormWrapperProps extends FormProps {
  parsedSteps?: ParsedStep[];
  questionnaireJson?: any;
  headerRightContent?: React.ReactNode;
}

export default function FormWrapper({
  initialAnswers = {},
  ownerComments = {},
  globalOwnerComments,
  onSave,
  onSubmit,
  parsedSteps: providedParsedSteps,
  questionnaireJson,
  headerRightContent,
  storageKey,
}: FormWrapperProps) {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});

  const parsedSteps = useMemo(() => {
    if (questionnaireJson) {
      try {
        const steps = parseJsonToFormStructure(questionnaireJson);
        // console.log("Parsed steps:", steps);
        return steps;
      } catch (err) {
        console.error("Parser error:", err);
        setError(`Failed to parse questionnaire structure: ${err instanceof Error ? err.message : String(err)}`);
        return [];
      }
    }
    return providedParsedSteps || [];
  }, [questionnaireJson, providedParsedSteps]);

  const validationSchema = useMemo(() => {
    try {
      return buildValidationSchema(parsedSteps);
    } catch (err) {
      console.error("Validation schema build error:", err);
      setError(`Failed to build validation schema: ${err instanceof Error ? err.message : String(err)}`);
      return yup.object({});
    }
  }, [parsedSteps]);

  type FormValues = Record<string, any>;
  const methods = useForm<FormValues>({
    resolver: yupResolver(validationSchema),
    mode: "onChange",
  });
  const {
    reset,
    handleSubmit,
    register,
    formState: { errors, touchedFields },
  } = methods;

  const dynamicForm = useDynamicForm(parsedSteps);
  const {
    language,
    setLanguage,
    formData,
    setFormData,
    visitedSteps,
    parentSteps,
    onNavigate,
    finishHandler,
    cancelHandler,
    isParentStep,
    currentChildId,
    currentChildParentId,
    pageIndexByStep,
    expandedStep,
    setExpandedStep,
    handleNavigate,
    handleNextPage,
    handlePreviousPage,
    isVeryLastPageOfLastStep,
    currentPage,
    isLastPageOfThisStep,
    isFirstPageOfThisStep,
    step,
    handleFieldChange,
    registerFieldRef,
    editExistingChild,
    reviewOutput,
    setReviewOutput,
    handleSubmit: dynamicHandleSubmit,
    setIsNewChild,
    prefillCurrentPageData,
    fieldErrors,
    setCurrentChildId,
    setCurrentChildParentId,
    clearCurrentStepFormData,
  } = dynamicForm as UseDynamicFormReturn;

  const { parentFormData, setParentFormData } = useFormData();

  const formInitialized = useRef(false);
  const lastInitialAnswers = useRef(JSON.stringify(initialAnswers));

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          reset(parsed as any);
          setFormData(parsed);
          formInitialized.current = true;
          lastInitialAnswers.current = JSON.stringify(parsed);
        }
      }
    } catch {}
    // run only on mount or storageKey change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Initialize from initialAnswers (first load only)
  useEffect(() => {
    if (!formInitialized.current && initialAnswers && Object.keys(initialAnswers).length > 0) {
      try {
        const currentInitialAnswers = JSON.stringify(initialAnswers);
        reset(initialAnswers as any);
        setFormData(initialAnswers);
        formInitialized.current = true;
        lastInitialAnswers.current = currentInitialAnswers;
      } catch {
        if (!formInitialized.current) {
          reset(initialAnswers as any);
          setFormData(initialAnswers);
          formInitialized.current = true;
        }
      }
    }
  }, [initialAnswers, reset, setFormData]);

  useEffect(() => {
    if (step && !formData[step.id]) {
      prefillCurrentPageData();
    }
    // Only depend on the step id existing and the formData snapshot for this step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, formData[step?.id as keyof typeof formData]]);

  const lastSavedData = useRef(JSON.stringify(formData));
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      lastSavedData.current = JSON.stringify(formData);
      return;
    }
    const currentStr = JSON.stringify(formData);
    if (
      currentStr !== lastSavedData.current &&
      Object.keys(formData).length > 0
    ) {
      const t = setTimeout(() => {
        onSave(formData);
        lastSavedData.current = JSON.stringify(formData);
        if (storageKey && typeof window !== "undefined") {
          try {
            sessionStorage.setItem(storageKey, lastSavedData.current);
          } catch {}
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [formData, onSave, storageKey]);

  const didInit = useRef(false);
  useEffect(() => {
    if (
      !didInit.current &&
      initialAnswers &&
      Object.keys(initialAnswers).length
    ) {
      didInit.current = true;
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("formData");
        sessionStorage.removeItem("parentFormData");
      }
      setFormData(initialAnswers);
      const parentDataWithChildren: Record<string, any> = {};
      Object.keys(initialAnswers).forEach((key) => {
        const answer = initialAnswers[key];
        if (answer && typeof answer === "object" && answer.childrenData) {
          parentDataWithChildren[key] = {
            ...answer,
            childrenData: answer.childrenData,
          };
        }
      });
      if (Object.keys(parentDataWithChildren).length > 0) {
        setParentFormData(parentDataWithChildren);
      }
    }
  }, [initialAnswers, setFormData, setParentFormData]);

  // Expose a flush event to immediately persist current form data before navigation
  const latestFormDataRef = useRef(formData);
  useEffect(() => {
    latestFormDataRef.current = formData;
  }, [formData]);

  const latestStorageKeyRef = useRef(storageKey);
  useEffect(() => {
    latestStorageKeyRef.current = storageKey;
  }, [storageKey]);

  const latestOnSaveRef = useRef(onSave);
  useEffect(() => {
    latestOnSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const snapshot = JSON.stringify(latestFormDataRef.current || {});
      if (latestStorageKeyRef.current) {
        try {
          sessionStorage.setItem(latestStorageKeyRef.current, snapshot);
        } catch {}
      }
      try {
        latestOnSaveRef.current(latestFormDataRef.current);
      } catch {}
      lastSavedData.current = snapshot;
    };
    window.addEventListener("drt:form:flush", handler);
    return () => window.removeEventListener("drt:form:flush", handler);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!parsedSteps.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-6 rounded shadow-md max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            No Questionnaire Available
          </h2>
          <p className="text-gray-600">
            The questionnaire data could not be loaded. Please try refreshing
            the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-6 rounded shadow-md max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-4">
            Error Loading Form
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (reviewOutput) {
    return (
      <ReviewSection
        parsedSteps={parsedSteps}
        reviewOutput={reviewOutput}
        formData={formData}
        parentFormData={parentFormData}
        language={language}
        setReviewOutput={setReviewOutput}
        onSubmit={onSubmit}
        onSave={onSave}
        ownerComments={ownerComments}
        globalOwnerComments={globalOwnerComments}
      />
    );
  }

  const handleFormSubmit = (values: any) => {
    const combined = { ...values };
    Object.keys(parentFormData).forEach((parentId) => {
      if (parentFormData[parentId]?.childrenData) {
        combined[parentId] = {
          ...combined[parentId],
          childrenData: parentFormData[parentId].childrenData,
        };
      }
    });
    onSubmit(combined);
  };

  return (
    <FormProvider {...methods}>
      <form
        className={styles.formLayout}
        onSubmit={handleSubmit(handleFormSubmit)}
        style={{
          fontFamily: theme.fonts.body,
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
        }}
      >
        <FormHeader
          language={language}
          setLanguage={setLanguage}
          formTitle={
            parsedSteps[0].title || {
              eng: "Default Title",
              fra: "Titre par défaut",
            }
          }
          rightContent={headerRightContent}
        />

        <div className={styles.mainContent}>
          {currentPage ? (
            <motion.div
              key={currentChildId || currentPage.pageKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {currentPage.pageLabel[language] && (
                <h2
                  className="mb-4 text-2xl font-semibold"
                  style={{
                    fontFamily: theme.fonts.heading,
                    color: theme.colors.primary,
                  }}
                >
                  {currentPage.pageLabel[language]}
                </h2>
              )}
              {currentPage.subheading && (
                <p
                  className="text-md mb-4 italic"
                  style={{ color: theme.colors.grey[600] }}
                >
                  {/* using domain formatter */}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: SubheadingFormatter.format(
                        currentPage.subheading[language]
                      ),
                    }}
                  />
                </p>
              )}

              {currentPage.sections.map((section) => (
                <div
                  key={section.sectionKey}
                  className="mb-8 p-4 rounded"
                  style={{ backgroundColor: theme.colors.grey[200] }}
                >
                  {section.sectionLabel[language] && (
                    <h3
                      className="mb-2 text-xl font-medium"
                      style={{
                        fontFamily: theme.fonts.heading,
                        color: theme.colors.primary,
                      }}
                    >
                      {section.sectionLabel[language]}
                    </h3>
                  )}
                  {section.subheading?.[language] && (
                    <div
                      className="text-md mb-4 italic pl-4"
                      style={{ color: theme.colors.grey[600] }}
                      dangerouslySetInnerHTML={{
                        __html: SubheadingFormatter.format(
                          section.subheading[language]
                        ),
                      }}
                    />
                  )}

                  {section.fields.map((field) => {
                    const name = `${step.id}.${field.id}` as const;
                    const value =
                      currentChildId && currentChildParentId
                        ? editExistingChild(
                            currentChildParentId,
                            currentChildId
                          )?.data[field.id] ?? ""
                        : (formData[step.id]?.[field.id] as any) ?? "";

                    const errorMsg = (errors as any)?.[step.id]?.[field.id]
                      ?.message as string | undefined;
                    const wasTouched = (touchedFields as any)?.[step.id]?.[
                      field.id
                    ] as boolean | undefined;
                    const descriptionMap = field.description ?? {};
                    const description =
                      (typeof descriptionMap === "object" &&
                        (descriptionMap as Record<string, string>)[language]) ||
                      (descriptionMap as Record<string, string>)?.eng ||
                      (typeof descriptionMap === "object"
                        ? Object.values(descriptionMap)[0]
                        : undefined);
                    const isLongDescription =
                      typeof description === "string" && description.length > 200;
                    const isExpanded =
                      !!expandedDescriptions[`${step.id}.${field.id}`];

                    return (
                      <div key={field.id} className="mb-4">
                        <label
                          htmlFor={name}
                          className="mb-1 block text-sm font-medium"
                          style={{ color: theme.colors.text }}
                        >
                          {field.labels[language]?.[field.id] ||
                            field.labels.eng?.[field.id]}
                          {field.validation?.conformance === "M" && (
                            <span
                              style={{ 
                                color: theme.colors.secondary || "#ff0000", 
                                marginLeft: "4px" 
                              }}
                            >
                              *
                            </span>
                          )}
                        </label>

                        {description && (
                          <div className="mb-2">
                            <p
                              className="text-sm"
                              style={{
                                color: theme.colors.grey[600],
                                whiteSpace: "pre-wrap",
                                ...(isLongDescription && !isExpanded
                                  ? {
                                      display: "-webkit-box",
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }
                                  : {}),
                              }}
                            >
                              {description}
                            </p>
                            {isLongDescription && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedDescriptions((prev) => ({
                                    ...prev,
                                    [`${step.id}.${field.id}`]: !prev[
                                      `${step.id}.${field.id}`
                                    ],
                                  }))
                                }
                                className="text-xs font-medium"
                                style={{ color: theme.colors.primary }}
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            )}
                          </div>
                        )}

                        <FieldRenderer
                          id={name}
                          field={field}
                          value={value}
                          language={language}
                          registerFieldRef={registerFieldRef}
                          register={register(name as any)}
                          handleFieldChange={(newVal) => {
                            handleFieldChange(field, newVal);
                            methods.setValue(name, newVal);
                          }}
                          saveCurrentPageData={() => {}}
                          onNavigate={onNavigate}
                          parsedSteps={parsedSteps}
                          parentFormData={parentFormData}
                          setIsNewChild={setIsNewChild}
                          setCurrentChildId={setCurrentChildId}
                          setCurrentChildParentId={setCurrentChildParentId}
                          clearCurrentStepFormData={clearCurrentStepFormData}
                        />

                        {errorMsg && wasTouched && (
                          <p
                            className="mt-1 text-sm"
                            style={{ color: theme.colors.secondary }}
                          >
                            {errorMsg}
                          </p>
                        )}
                        {fieldErrors[field.id] && (
                          <div className="mt-1 text-sm text-red-600">
                            {fieldErrors[field.id]}
                          </div>
                        )}
                        {ownerComments[field.id] && (
                          <div
                            className="mt-2 p-2 text-sm rounded"
                            style={{
                              backgroundColor: theme.colors.pink[200],
                              color: theme.colors.dark,
                            }}
                          >
                            <strong>Owner Comment:</strong>{" "}
                            {ownerComments[field.id]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              <NavigationButtons
                step={step}
                parentSteps={parentSteps}
                isParentStep={isParentStep}
                isVeryLastPageOfLastStep={isVeryLastPageOfLastStep}
                isFirstPageOfThisStep={isFirstPageOfThisStep}
                isLastPageOfThisStep={isLastPageOfThisStep}
                handleNextPage={() => {
                  handleNextPage();
                  window.scrollTo(0, 0);
                }}
                handlePreviousPage={() => {
                  handlePreviousPage();
                  window.scrollTo(0, 0);
                }}
                cancelHandler={cancelHandler}
                finishHandler={finishHandler}
                handleSubmit={() => {
                  // Use dynamic form's review trigger if you want; otherwise keep this
                  dynamicHandleSubmit();
                  const combined = { ...formData };
                  Object.keys(parentFormData).forEach((parentId) => {
                    if (parentFormData[parentId]?.childrenData) {
                      combined[parentId] = {
                        ...combined[parentId],
                        childrenData: parentFormData[parentId].childrenData,
                      };
                    }
                  });
                  onSave(combined);
                }}
              />
            </motion.div>
          ) : (
            <div>No pages found for this step.</div>
          )}
        </div>

        <Sidebar
          parsedSteps={parsedSteps}
          visitedSteps={visitedSteps}
          currentStep={step}
          pageIndexByStep={pageIndexByStep}
          onNavigate={handleNavigate}
          language={language}
          expandedStep={expandedStep}
          setExpandedStep={setExpandedStep}
        />
        <div className={styles.footer}>
          <Footer />
        </div>
      </form>
    </FormProvider>
  );
}
