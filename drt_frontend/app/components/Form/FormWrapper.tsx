// drt_frontend/app/components/Form/FormWrapper.tsx
"use client";

import React, { useEffect, useRef } from "react";
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

import FormHeader from "./FormHeader";
import FieldRenderer from "./FieldRenderer";
import NavigationButtons from "./NavigationButtons";
import Sidebar from "./Sidebar";
import ReviewSection from "./ReviewSection";

import styles from "./Form.module.css";
import Footer from "../../../Footer/footer";

// 1️⃣ Build & type your schema
const unsorted = parseJsonToFormStructure();
const parsedSteps = sortStepsByReferences(unsorted);
const validationSchema = buildValidationSchema(parsedSteps);
type FormValues = yup.InferType<typeof validationSchema>;

export default function FormWrapper({
  initialAnswers = {},
  ownerComments = {},
  globalOwnerComments,
  onSave,
  onSubmit,
}: FormProps) {
  // 2️⃣ RHF setup
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

  // 3️⃣ Your dynamic‐form hook
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
  }: UseDynamicFormReturn = useDynamicForm(parsedSteps);

  // 4️⃣ Sync external formData → RHF
  useEffect(() => {
    reset(formData as any);
  }, [formData, reset]);

  // 5️⃣ Pre-fill on step/page changes
  useEffect(() => {
    prefillCurrentPageData();
  }, [currentStep, pageIndexByStep, currentChildId, prefillCurrentPageData]);

  // 6️⃣ One-time init from initialAnswers
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

  // 7️⃣ Nothing to render yet?
  if (!parsedSteps.length) {
    return <div>Loading form structure...</div>;
  }

  // 8️⃣ REVIEW MODE
  if (reviewOutput) {
    const { parentFormData } = useFormData();
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

  // 9️⃣ NORMAL FORM MODE
  return (
    <FormProvider {...methods}>
      <form
        className={styles.formLayout}
        onSubmit={handleSubmit(onSubmit)}
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
                <h2 className="mb-4 text-2xl font-semibold">
                  {currentPage.pageLabel[language]}
                </h2>
              )}
              {currentPage.subheading && (
                <p className="text-md mb-4 italic text-gray-600">
                  {currentPage.subheading[language]}
                </p>
              )}

              {/* Sections & Fields */}
              {currentPage.sections.map((section) => (
                <div
                  key={section.sectionKey}
                  className="mb-8 bg-gray-50 p-4 rounded"
                >
                  {section.sectionLabel[language] && (
                    <h3 className="mb-2 text-xl font-medium">
                      {section.sectionLabel[language]}
                    </h3>
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
                    const wasTouched = (touchedFields as any)?.[step.id]
                      ?.[field.id] as boolean | undefined;

                    return (
                      <div key={field.id} className="mb-4">
                        <label
                          htmlFor={name}
                          className="mb-1 block text-sm font-medium"
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
                            methods.setValue(name, newVal, {
                              shouldValidate: true,
                              shouldTouch: true,
                            });
                          }}
                          saveCurrentPageData={() => onSave(formData)}
                          formData={formData}
                          stepId={step.id}
                          createNewChild={createNewChild}
                          editExistingChild={editExistingChild}
                          deleteChild={deleteChild}
                          onNavigate={onNavigate}
                          parsedSteps={parsedSteps}
                          parentFormData={useFormData().parentFormData}
                          currentChildId={currentChildId}
                          currentChildParentId={currentChildParentId}
                          isNewChild={isNewChild}
                          setIsNewChild={setIsNewChild}
                        />

                        {/* only show error if blurred */}
                        {errorMsg && wasTouched && (
                          <p className="mt-1 text-sm text-red-600">
                            {errorMsg}
                          </p>
                        )}

                        {/* Owner Comment */}
                        {ownerComments[field.id] && (
                          <div className="mt-2 p-2 bg-yellow-100 text-sm rounded">
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
                finishHandler={handleSubmit(onSubmit)}
                handleSubmit_openAIRE={() => {
                  handleSubmit_openAIRE();
                  onSave(formData);
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
          <p className="text-center text-gray-600">
            © 2025 University of Guelph. All rights reserved.
          </p>
        </div>
      </form>
    </FormProvider>
  );
}
