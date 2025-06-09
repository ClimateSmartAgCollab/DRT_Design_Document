// drt_frontend\app\components\Form\NavigationButtons.tsx
"use client";

import React from "react";
import { ParsedStep } from "./types";

interface NavigationButtonsProps {
  step: ParsedStep;
  parentSteps: ParsedStep[];
  isParentStep: (step: ParsedStep) => boolean;
  isVeryLastPageOfLastStep: boolean;
  isFirstPageOfThisStep: boolean;
  isLastPageOfThisStep: boolean;
  handleNextPage: () => void;
  handlePreviousPage: () => void;
  cancelHandler: () => void;
  finishHandler: () => void;
  handleSubmit_openAIRE: () => void;
}

export default function NavigationButtons({
  step,
  parentSteps,
  isParentStep,
  isVeryLastPageOfLastStep,
  isFirstPageOfThisStep,
  isLastPageOfThisStep,
  handleNextPage,
  handlePreviousPage,
  cancelHandler,
  finishHandler,
  handleSubmit_openAIRE,
}: NavigationButtonsProps) {
  const isFirstParentPage =
    parentSteps.findIndex((p) => p.id === step.id) === 0 &&
    isFirstPageOfThisStep;

  // If this is a parent step, show back to previous parent or page, and either Next or Review
  if (isParentStep(step)) {
    // console.log("isFirstParentPage", isFirstParentPage);
    // console.log("isFirstPageOfThisStep", isFirstPageOfThisStep);
    return (
      <div className="mt-8 flex items-center space-x-4">
        <button
          type="button"
          onClick={() => {
            if (!isFirstParentPage) {
              handlePreviousPage();
              window.scrollTo(0, 0);
            }
          }}
          disabled={isFirstParentPage}
          className={
            `rounded px-4 py-2 ` +
            (isFirstParentPage
              ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
              : "bg-gray-300 text-gray-800 hover:bg-gray-400")
          }
        >
          Back
        </button>

        {isVeryLastPageOfLastStep ? (
          <button
            type="button"
            onClick={() => {
              handleSubmit_openAIRE();
            }}
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Review
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              handleNextPage();
              window.scrollTo(0, 0);
            }}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Next
          </button>
        )}
      </div>
    );
  }

  // If on a child step and it’s not the last page: Back + Next
  if (!isLastPageOfThisStep) {
    return (
      <div className="mt-8 flex items-center space-x-4">
        <button
          type="button"
          onClick={() => {
            handlePreviousPage();
            window.scrollTo(0, 0);
          }}
          className="rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
          disabled={isFirstPageOfThisStep}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            handleNextPage();
            window.scrollTo(0, 0);
          }}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Next
        </button>
      </div>
    );
  }

  // If on a child step’s last page: Cancel + Finish
  return (
    <div className="mt-8 flex items-center space-x-4">
      <button
        type="button"
        onClick={cancelHandler}
        className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={finishHandler}
        className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
      >
        Finish
      </button>
    </div>
  );
}
