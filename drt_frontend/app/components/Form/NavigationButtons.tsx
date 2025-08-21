"use client";
import React from "react";
import { ParsedStep } from "./types";
import { useTheme } from "./hooks/useTheme";

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
  handleSubmit: () => void;
}

export default function NavigationButtons(props: NavigationButtonsProps) {
  const {
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
    handleSubmit,
  } = props;

  const theme = useTheme();
  const buttonBaseStyle = {
    padding: "0.75rem 1.5rem",
    borderRadius: "0.375rem",
    border: "none",
    cursor: "pointer",
    fontFamily: theme.fonts.body,
    fontWeight: "500",
    fontSize: "0.875rem",
    transition: "all 0.2s ease-in-out",
  };
  const primaryButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: theme.colors.primary,
    color: theme.colors.white,
  };
  const secondaryButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: theme.colors.grey[300],
    color: theme.colors.text,
  };
  const successButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: theme.colors.green[400],
    color: theme.colors.white,
  };
  const dangerButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: theme.colors.secondary,
    color: theme.colors.white,
  };
  const disabledButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: theme.colors.grey[200],
    color: theme.colors.grey[600],
    cursor: "not-allowed",
    opacity: 0.5,
  };

  const isFirstParentPage =
    parentSteps.findIndex((p) => p.id === step.id) === 0 &&
    isFirstPageOfThisStep;

  if (isParentStep(step)) {
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
          style={isFirstParentPage ? disabledButtonStyle : secondaryButtonStyle}
        >
          Back
        </button>

        {isVeryLastPageOfLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            style={primaryButtonStyle}
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
            style={primaryButtonStyle}
          >
            Next
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {!isLastPageOfThisStep ? (
        <div className="mt-8 flex items-center space-x-4">
          <button
            type="button"
            onClick={() => {
              handlePreviousPage();
              window.scrollTo(0, 0);
            }}
            disabled={isFirstPageOfThisStep}
            style={
              isFirstPageOfThisStep ? disabledButtonStyle : secondaryButtonStyle
            }
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              handleNextPage();
              window.scrollTo(0, 0);
            }}
            style={primaryButtonStyle}
          >
            Next
          </button>
        </div>
      ) : (
        <div className="mt-8 flex items-center space-x-4">
          <button
            type="button"
            onClick={cancelHandler}
            style={dangerButtonStyle}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={finishHandler}
            style={successButtonStyle}
          >
            Finish
          </button>
        </div>
      )}
    </>
  );
}
