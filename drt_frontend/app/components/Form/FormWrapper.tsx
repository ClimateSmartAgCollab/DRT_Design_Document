// drt_frontend\app\components\Form\FormWrapper.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

import { parseJsonToFormStructure } from "../parser";
import { ParsedStep, FormProps, UseDynamicFormReturn } from "./types";
import {
  useDynamicForm,
  sortStepsByReferences,
} from "../Form/hooks/useDynamicForm";
import { useFormData } from "../Form/context/FormDataContext";

import FormHeader from "./FormHeader";
import FieldRenderer from "./FieldRenderer";
import NavigationButtons from "./NavigationButtons";
import Sidebar from "./Sidebar";
import ReviewSection from "./ReviewSection";

import styles from "./Form.module.css";
import Footer from "../../../Footer/footer";

export default function FormWrapper({
  initialAnswers = {},
  ownerComments = {},
  globalOwnerComments,
  onSave,
  onSubmit,
}: FormProps) {
  const unsortedSteps: ParsedStep[] = parseJsonToFormStructure();
  const parsedSteps: ParsedStep[] = sortStepsByReferences(unsortedSteps);

  const {
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
    fieldErrors,
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

  const { parentFormData } = useFormData();

  // Prefill DOM fields whenever step / page / child context changes
  useEffect(() => {
    prefillCurrentPageData();
  }, [currentStep, pageIndexByStep, currentChildId, prefillCurrentPageData]);

  // One‐time effect: load initialAnswers if provided
  const didInit = useRef(false);
  useEffect(() => {
    if (
      !didInit.current &&
      initialAnswers &&
      Object.keys(initialAnswers).length > 0
    ) {
      didInit.current = true;
      setFormData(initialAnswers);
      finishHandler();
    }
  }, [initialAnswers, setFormData, finishHandler]);

  if (!parsedSteps || parsedSteps.length === 0) {
    return <div>Loading form structure...</div>;
  }

  const save = () => onSave(formData);

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

  // NORMAL FORM MODE
  return (
    <form className={styles.formLayout}>
      {/* ─── HEADER ───────────────────────────────────── */}
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

      {/* ─── MAIN CONTENT (current page) ─────────────────────── */}
      <div className={styles.mainContent}>
        {currentPage ? (
          <motion.div
            key={currentChildId || currentPage.pageKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {currentPage.pageLabel[language] && (
              <h2 className="mb-4 text-2xl font-semibold">
                {currentPage.pageLabel[language] || currentPage.pageLabel.eng}
              </h2>
            )}
            {currentPage.subheading && (
              <p className="text-md mb-4 italic text-gray-600">
                {currentPage.subheading[language] || currentPage.subheading.eng}
              </p>
            )}

            {currentPage.sections.map((section) => (
              <div key={section.sectionKey} className="mb-8 bg-gray-50 p-4">
                {section.sectionLabel[language] && (
                  <h3 className="mb-2 text-xl font-medium">
                    {section.sectionLabel[language] || section.sectionLabel.eng}
                  </h3>
                )}

                {section.fields.map((field) => {
                  const fieldValue =
                    currentChildId && currentChildParentId
                      ? editExistingChild(currentChildParentId, currentChildId)
                          ?.data[field.id] ?? ""
                      : formData[step.id]?.[field.id] ?? "";

                  return (
                    <div key={field.id} className="mb-4">
                      {/* Field Label */}
                      <label className="mb-1 block text-sm font-medium">
                        {field.labels[language]?.[field.id] ||
                          field.labels.eng?.[field.id]}
                      </label>

                      {/* Field Renderer handles each type */}
                      <FieldRenderer
                        field={field}
                        value={fieldValue}
                        language={language}
                        registerFieldRef={registerFieldRef}
                        handleFieldChange={(newVal) =>
                          handleFieldChange(field, newVal)
                        }
                        saveCurrentPageData={save}
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
                      />

                      {/* Owner Comment */}
                      {ownerComments[field.id] && (
                        <div className="mt-2 p-2 bg-yellow-100 text-sm rounded">
                          <strong>Owner Comment:</strong>{" "}
                          {ownerComments[field.id]}
                        </div>
                      )}
                      {/* Validation Error */}
                      {fieldErrors[field.id] && (
                        <div className="mt-1 text-sm text-red-600">
                          {fieldErrors[field.id]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* ─── NAVIGATION BUTTONS ──────────────────────────── */}
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
                save();
              }}
            />
          </motion.div>
        ) : (
          <div>No pages found for this step.</div>
        )}
      </div>

      {/* ─── SIDEBAR ───────────────────────────────────── */}
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

      {/* ─── FOOTER ─────────────────────────────────────── */}
      <div className={styles.footer}>
        <Footer />
        <p className="text-center text-gray-600">
          © 2025 University of Guelph. All rights reserved.
        </p>
      </div>
    </form>
  );
}
