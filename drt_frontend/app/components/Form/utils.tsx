// drt_frontend\app\components\Form\utils.tsx
"use client";

import React from "react";
import { ParsedStep, ParsedField } from "./types";


export function getStepIndex(steps: ParsedStep[], stepId: string): number {
  return steps.findIndex((s) => s.id === stepId);
}


export function ErrorMessage({
  fieldId,
  errors,
}: {
  fieldId: string;
  errors: Record<string, string>;
}) {
  const msg = errors[fieldId];
  if (!msg) return null;
  return <div className="mt-1 text-sm text-red-600">{msg}</div>;
}


export function OwnerComment({
  fieldId,
  comments,
}: {
  fieldId: string;
  comments?: Record<string, string>;
}) {
  if (!comments) return null;
  const comment = comments[fieldId];
  if (!comment) return null;
  return (
    <div className="mt-2 p-2 bg-yellow-100 text-sm rounded">
      <strong>Owner Comment:</strong> {comment}
    </div>
  );
}
