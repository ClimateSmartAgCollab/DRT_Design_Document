// drt_frontend/app/components/Form/FormWrapper.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion } from "framer-motion";

import { parseJsonToFormStructure } from "../parser";
import type { ParsedStep, FormProps, UseDynamicFormReturn } from "./types";
import {
  useDynamicForm,
  sortStepsByReferences,
} from "../Form/hooks/useDynamicForm";
import { useFormData } from "../Form/context/FormDataContext";
import { buildValidationSchema } from "./hooks/useDynamicForm/validationSchema";
import { useTheme } from "./hooks/useTheme";
import { isValid__UTF8 } from "./hooks/useDynamicForm/utils";

import FormHeader from "./FormHeader";
import FieldRenderer from "./FieldRenderer";
import NavigationButtons from "./NavigationButtons";
import Sidebar from "./Sidebar";
import ReviewSection from "./ReviewSection";

import styles from "./Form.module.css";
import Footer from "../Footer/footer";



interface FormWrapperProps extends FormProps {
  parsedSteps?: ParsedStep[]; 
  questionnaireJson?: any; 
}

const formatSubheading = (text: string): string => {
  if (!text) return '';
    const paragraphs = text.split('\n\n');
  
  const formattedParagraphs = paragraphs.map(paragraph => {
    if (paragraph.includes('•')) {
      const lines = paragraph.split('\n');
      const formattedLines = lines.map(line => {
        if (line.trim().startsWith('•')) {
          return `<li>${line.trim().substring(1).trim()}</li>`;
        } else if (line.trim().includes(':')) {
          return `<strong>${line.trim()}</strong>`;
        } else {
          return line.trim();
        }
      });
      
      const listItems = formattedLines.filter(line => line.startsWith('<li>'));
      const otherLines = formattedLines.filter(line => !line.startsWith('<li>'));
      
      let result = '';
      if (otherLines.length > 0) {
        result += otherLines.join('<br/>');
      }
      if (listItems.length > 0) {
        result += '<ul style="margin: 8px 0; padding-left: 20px;">' + listItems.join('') + '</ul>';
      }
      return result;
    } else {
      return paragraph.trim().replace(/\n/g, '<br/>');
    }
  });
  
  return formattedParagraphs.join('<br/><br/>');
};

export default function FormWrapper({
  initialAnswers = {},
  ownerComments = {},
  globalOwnerComments,
  onSave,
  onSubmit,
  parsedSteps: providedParsedSteps, 
  questionnaireJson, 
}: FormWrapperProps) {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const parsedSteps = useMemo(() => {
    if (questionnaireJson) {
      try {
        return parseJsonToFormStructure(questionnaireJson);
      } catch (err) {
        setError('Failed to parse questionnaire structure');
        return [];
      }
    }
    return providedParsedSteps || [];
  }, [questionnaireJson, providedParsedSteps]);

  // Build validation schema
  const validationSchema = useMemo(() => {
    try {
      return buildValidationSchema(parsedSteps);
    } catch (err) {
      setError('Failed to build validation schema');
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
    formState: { errors, touchedFields } 
  } = methods;

  // dynamic‐form hook
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
    createNewChild,
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
    deleteChild,
    reviewOutput,
    setReviewOutput,
    handleSubmit_openAIRE,
    isNewChild,
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
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      try {
        const currentInitialAnswers = JSON.stringify(initialAnswers);
        const hasChanged = currentInitialAnswers !== lastInitialAnswers.current;
        
        // Only reset on initial load, never after that to preserve user input
        if (!formInitialized.current) {
          reset(initialAnswers as any);
          setFormData(initialAnswers);
          formInitialized.current = true;
          lastInitialAnswers.current = currentInitialAnswers;
        }
      } catch (error) {
        console.error('Error in form reset logic:', error);
        // Fallback: initialize form if there's an error
        if (!formInitialized.current) {
          reset(initialAnswers as any);
          setFormData(initialAnswers);
          formInitialized.current = true;
        }
      }
    }
  }, [initialAnswers, formData, step, reset, setFormData]);

  useEffect(() => {
    if (step && !formData[step.id]) {
      prefillCurrentPageData();
    }
  }, [step?.id]);

  // Auto-save when formData changes (but only for actual changes, not initial load)
  const lastSavedData = useRef(JSON.stringify(formData));
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      lastSavedData.current = JSON.stringify(formData);
      return;
    }
    
    const currentFormDataString = JSON.stringify(formData);
    if (currentFormDataString !== lastSavedData.current && Object.keys(formData).length > 0) {
      // Debounce the save to avoid too many API calls
      const timeoutId = setTimeout(() => {
        onSave(formData);
        lastSavedData.current = JSON.stringify(formData);
      }, 2000); // Save after 2 seconds of no changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, onSave]);

  // One-time init from initialAnswers
  const didInit = useRef(false);
  useEffect(() => {
    if (
      !didInit.current &&
      initialAnswers &&
      Object.keys(initialAnswers).length
    ) {
      didInit.current = true;
      
      // Clear sessionStorage to ensure we start fresh with the new data
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("formData");
        sessionStorage.removeItem("parentFormData");
      }
      
      setFormData(initialAnswers);
      
      // Initialize parentFormData with children data from initialAnswers
      const parentDataWithChildren: Record<string, any> = {};
      Object.keys(initialAnswers).forEach(key => {
        const answer = initialAnswers[key];
        if (answer && typeof answer === 'object' && answer.childrenData) {
          parentDataWithChildren[key] = {
            ...answer,
            childrenData: answer.childrenData
          };
        }
      });
      
      if (Object.keys(parentDataWithChildren).length > 0) {
        setParentFormData(parentDataWithChildren);
      }
    }
  }, [initialAnswers, setFormData, setParentFormData]);

  if (!parsedSteps.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-6 rounded shadow-md max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">No Questionnaire Available</h2>
          <p className="text-gray-600">
            The questionnaire data could not be loaded. Please try refreshing the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-6 rounded shadow-md max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-4">Error Loading Form</h2>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-6 rounded shadow-md max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // REVIEW MODE
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

  const handleFormSubmit = (formData: any) => {
    const combinedData = { ...formData };
    
    Object.keys(parentFormData).forEach(parentId => {
      if (parentFormData[parentId] && parentFormData[parentId].childrenData) {
        combinedData[parentId] = {
          ...combinedData[parentId],
          childrenData: parentFormData[parentId].childrenData
        };
      }
    });
    
    onSubmit(combinedData);
  };

  // NORMAL FORM MODE
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
        />

        <div className={styles.mainContent}>
          {currentPage ? (
            <motion.div
              key={currentChildId || currentPage.pageKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Page Title & Subheading */}
              {currentPage.pageLabel[language] && (
                <h2 
                  className="mb-4 text-2xl font-semibold"
                  style={{ fontFamily: theme.fonts.heading, color: theme.colors.primary }}
                >
                  {currentPage.pageLabel[language]}
                </h2>
              )}
              {currentPage.subheading && (
                <p 
                  className="text-md mb-4 italic"
                  style={{ color: theme.colors.grey[600] }}
                >
                  {currentPage.subheading[language]}
                </p>
              )}

              {/* Sections & Fields */}
              {currentPage.sections.map((section) => (
                <div
                  key={section.sectionKey}
                  className="mb-8 p-4 rounded"
                  style={{ backgroundColor: theme.colors.grey[200] }}
                >
                  {section.sectionLabel[language] && (
                    <h3 
                      className="mb-2 text-xl font-medium"
                      style={{ fontFamily: theme.fonts.heading, color: theme.colors.primary }}
                    >
                      {section.sectionLabel[language]}
                    </h3>
                  )}
                  {section.subheading && section.subheading[language] && (
                    <div 
                      className="text-md mb-4 italic pl-4"
                      style={{ color: theme.colors.grey[600] }}
                      dangerouslySetInnerHTML={{
                        __html: formatSubheading(section.subheading[language])
                      }}
                    />
                  )}

                  {section.fields.map((field) => {
                    // RHF name: "stepId.fieldId"
                    const name = `${step.id}.${field.id}` as const;

                    // current dynamic value
                    const value =
                      currentChildId && currentChildParentId
                        ? editExistingChild(
                            currentChildParentId,
                            currentChildId
                          )?.data[field.id] ?? ""
                        : (formData[step.id]?.[field.id] as any) ?? "";

                    // RHF error & touched
                    const errorMsg = (errors as any)?.[step.id]?.[field.id]
                      ?.message as string | undefined;
                    const wasTouched = (touchedFields as any)?.[step.id]?.[
                      field.id
                    ] as boolean | undefined;

                    return (
                      <div key={field.id} className="mb-4">
                        <label
                          htmlFor={name}
                          className="mb-1 block text-sm font-medium"
                          style={{ color: theme.colors.text }}
                        >
                          {field.labels[language]?.[field.id] ||
                            field.labels.eng?.[field.id]}
                        </label>

                        <FieldRenderer
                          id={name}
                          field={field}
                          value={value}
                          language={language}
                          registerFieldRef={registerFieldRef}
                          // Register with RHF:
                          register={register(name as any)}
                          // dynamic onChange + keep RHF in sync:
                          handleFieldChange={(newVal) => {
                            handleFieldChange(field, newVal);
                            methods.setValue(name, newVal);
                          }}
                          saveCurrentPageData={() => {
                            // This function is called on field blur, but we don't need to save immediately
                            // The form data is already updated by handleFieldChange
                            // We'll let the useEffect handle saving when formData changes
                          }}
                          formData={formData}
                          stepId={step.id}
                          createNewChild={createNewChild}
                          editExistingChild={editExistingChild}
                          deleteChild={deleteChild}
                          onNavigate={onNavigate}
                          parsedSteps={parsedSteps}
                          parentFormData={parentFormData}
                          currentChildId={currentChildId}
                          currentChildParentId={currentChildParentId}
                          isNewChild={isNewChild}
                          setIsNewChild={setIsNewChild}
                          setCurrentChildId={setCurrentChildId}
                          setCurrentChildParentId={setCurrentChildParentId}
                          fieldErrors={fieldErrors}
                          isValid__UTF8={isValid__UTF8}
                          clearCurrentStepFormData={clearCurrentStepFormData}
                        />

                        {/* only show error if blurred */}
                        {errorMsg && wasTouched && (
                          <p 
                            className="mt-1 text-sm"
                            style={{ color: theme.colors.secondary }}
                          >
                            {errorMsg}
                          </p>
                        )}

                        {/* Show Validation Errors */}
                        {fieldErrors[field.id] && (
                          <div className='mt-1 text-sm text-red-600'>
                            {fieldErrors[field.id]}
                          </div>
                        )}

                        {/* Owner Comment */}
                        {ownerComments[field.id] && (
                          <div 
                            className="mt-2 p-2 text-sm rounded"
                            style={{ 
                              backgroundColor: theme.colors.pink[200],
                              color: theme.colors.dark 
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

              {/* Navigation */}
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
                handleSubmit_openAIRE={() => {
                  handleSubmit_openAIRE();
                  const combinedData = { ...formData };
                  
                  Object.keys(parentFormData).forEach(parentId => {
                    if (parentFormData[parentId] && parentFormData[parentId].childrenData) {
                      combinedData[parentId] = {
                        ...combinedData[parentId],
                        childrenData: parentFormData[parentId].childrenData
                      };
                    }
                  });
                  
                  onSave(combinedData);
                }}
              />
            </motion.div>
          ) : (
            <div>No pages found for this step.</div>
          )}
        </div>

        {/* Sidebar & Footer */}
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
