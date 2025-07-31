// drt_frontend/app/components/Form/FormWrapper.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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
import ChildReview from "./ChildReview";

import styles from "./Form.module.css";
import Footer from "../Footer/footer";

// Development-only test data
const DEV_TEST_DATA = {
  "EJNfvCh1PK8qqUa52RcZ73uwxJRQZrFo2LGmwhxDRrC3": {
    q1: "John Smith",
    q2: "john.smith@uoguelph.ca",
    q3: "University of Guelph",
    q4: "Canada",
    q5: "Guelph",
    q6: "Dr. Jane Doe",
    q7: "jane.doe@uoguelph.ca",
    q8: "University of Guelph",
    q9: "Canada",
    q10: "Guelph",
    "q10.5": {
      childrenData: {
        "ENvnAeARrwf17hM66r0NSX9IqwCbj_M9ZS13pq_aa0al": [
          {
            id: "collaborator-1",
            data: {
              q1: "Dr. Alice Johnson",
              q2: "University of Guelph",
              q3: "Will work with anonymized subset of the data",
              q4: "Data analysis and statistical modeling"
            },
            stepId: "ENvnAeARrwf17hM66r0NSX9IqwCbj_M9ZS13pq_aa0al",
            parentId: "q10.5"
          },
          {
            id: "collaborator-2", 
            data: {
              q1: "Prof. Bob Wilson",
              q2: "University of Guelph",
              q3: "Will work with the full dataset",
              q4: "GIS analysis and spatial modeling"
            },
            stepId: "ENvnAeARrwf17hM66r0NSX9IqwCbj_M9ZS13pq_aa0al",
            parentId: "q10.5"
          }
        ]
      }
    },
    q11: "How do environmental factors affect agricultural productivity in different regions?",
    q12: ["academic", "educational"],
    q13: "Academic publications, master's thesis, technical report for policy stakeholders, web-based visualization tool for farmers",
    q14: "Data will be stored on encrypted university servers with access restricted to authorized collaborators only. All data transfers will be logged and monitored.",
    q15: "2024-06-01",
    q16: "18 months",

  }
};

const defaultParsedSteps: ParsedStep[] = [];

interface FormWrapperProps extends FormProps {
  parsedSteps?: ParsedStep[]; 
  questionnaireJson?: any; 
}

// Helper function to format subheading text with line breaks and bullet points
const formatSubheading = (text: string): string => {
  if (!text) return '';
  
  // Split by double line breaks to separate paragraphs
  const paragraphs = text.split('\n\n');
  
  // Process each paragraph
  const formattedParagraphs = paragraphs.map(paragraph => {
    // Check if paragraph contains bullet points
    if (paragraph.includes('•')) {
      // Split by single line breaks to separate bullet points
      const lines = paragraph.split('\n');
      const formattedLines = lines.map(line => {
        if (line.trim().startsWith('•')) {
          // Format bullet points
          return `<li>${line.trim().substring(1).trim()}</li>`;
        } else if (line.trim().includes(':')) {
          // Format section headers (like "Role:", "Responsibilities:")
          return `<strong>${line.trim()}</strong>`;
        } else {
          // Regular text
          return line.trim();
        }
      });
      
      // Join bullet points in a list
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
      // Regular paragraph
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
  
  const parsedSteps = useMemo(() => {
    if (questionnaireJson) {
      try {
        const unsorted = parseJsonToFormStructure(questionnaireJson);
        const sorted = sortStepsByReferences(unsorted);
        
        if (!sorted || sorted.length === 0) {
          console.warn("No valid steps found in questionnaire JSON");
          return [];
        }
        
        return sorted;
      } catch (error) {
        console.error("Error parsing questionnaire JSON:", error);
        return [];
      }
    }
    
    if (providedParsedSteps) {
      return providedParsedSteps;
    }
    
    console.warn("No questionnaire JSON or provided steps available");
    return [];
  }, [questionnaireJson, providedParsedSteps]);
  
  if (!parsedSteps || parsedSteps.length === 0) {
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
  
  const validationSchema = useMemo(() => buildValidationSchema(parsedSteps), [parsedSteps]);
  type FormValues = yup.InferType<typeof validationSchema>;

  const methods = useForm<FormValues>({
    resolver: yupResolver(validationSchema),
    defaultValues: initialAnswers as any,
    mode: "onBlur",
    reValidateMode: "onBlur",
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, touchedFields },
  } = methods;

  // dynamic‐form hook
  const dynamicForm = useDynamicForm(parsedSteps);

  const {
    language,
    setLanguage,
    formData,
    setFormData,
    currentStep,
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
  } = dynamicForm as UseDynamicFormReturn;

  const { parentFormData, setParentFormData } = useFormData();

  useEffect(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      const hasChanges = JSON.stringify(initialAnswers) !== JSON.stringify(formData);
      if (hasChanges) {
        console.log("Resetting form with new initial answers");
        reset(initialAnswers as any);
        setFormData(initialAnswers);
      }
    }
  }, [initialAnswers]); // Only depend on initialAnswers, not navigation

  useEffect(() => {
    if (step && !formData[step.id]) {
      prefillCurrentPageData();
    }
  }, [step?.id]);

  // One-time init from initialAnswers
  const didInit = useRef(false);
  useEffect(() => {
    if (
      !didInit.current &&
      initialAnswers &&
      Object.keys(initialAnswers).length
    ) {
      didInit.current = true;
      setFormData(initialAnswers);
      finishHandler();
    }
  }, [initialAnswers, setFormData, finishHandler]);

  if (!parsedSteps.length) {
    return <div>Loading form structure...</div>;
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
        {/* DEBUG BUTTONS - visible in all environments */}
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
            <button
              type="button"
              onClick={() => {
                console.log("Filling form with test data...");

                const stepData =
                  DEV_TEST_DATA["EJNfvCh1PK8qqUa52RcZ73uwxJRQZrFo2LGmwhxDRrC3"];
                const { "q10.5": q10_5, ...mainFields } = stepData as any;

                const mainFormData = {
                  EJNfvCh1PK8qqUa52RcZ73uwxJRQZrFo2LGmwhxDRrC3: mainFields,
                };

                setFormData(mainFormData);

                Object.entries(mainFormData).forEach(([stepId, stepData]) => {
                  Object.entries(stepData).forEach(([fieldId, value]) => {
                    const fieldName = `${stepId}.${fieldId}`;
                    methods.setValue(fieldName as any, value);
                  });
                });

                setParentFormData({
                  "q10.5": q10_5,
                });

                console.log("Form filled with test data including children!");
              }}
              style={{
                padding: "8px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#0056b3")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#007bff")
              }
            >
              🧪 Fill Test Data
            </button>
            <button
              type="button"
              onClick={() => {
                console.log("Current form data:", formData);
                console.log(
                  "Current React Hook Form values:",
                  methods.getValues()
                );
              }}
              style={{
                padding: "8px 12px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#1e7e34")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#28a745")
              }
                         >
               📊 Log State
             </button>
           </div>

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
                          register={(register as any)(name)}
                          // dynamic onChange + keep RHF in sync:
                          handleFieldChange={(newVal) => {
                            handleFieldChange(field, newVal);
                            methods.setValue(name, newVal);
                          }}
                          saveCurrentPageData={() => onSave(formData)}
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
