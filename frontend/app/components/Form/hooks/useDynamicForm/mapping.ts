// drt_frontend/app/components/Form/hooks/useDynamicForm/mapping.ts
import { useState, useCallback } from "react";
import { SubmissionMapper } from "../../domain/submission-mapper";


export function useSubmissionMapping(
  parsedSteps: any[], // Step[]
  formData: Record<string, any>,
  parentFormData: Record<string, any>,
  language: string
) {
  const [reviewOutput, setReviewOutput] = useState<{
    title?: string;
    questions: any[];
    submittedAt?: string;
  } | null>(null);

  const handleSubmit = useCallback(() => {
    const mapper = new SubmissionMapper(
      parsedSteps as any,
      formData,
      parentFormData,
      language
    );
    const output = mapper.buildReviewOutput();
    setReviewOutput(output);
  }, [parsedSteps, formData, parentFormData, language]);

  return {
    reviewOutput,
    setReviewOutput,
    handleSubmit,
  };
}
