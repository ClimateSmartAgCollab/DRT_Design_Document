// drt_frontend/app/components/Form/hooks/useDynamicForm/mapping.ts
import { useState, useCallback } from "react";
import fetchApi from "@/app/api/apiHelper";
import { SubmissionMapper } from "../../domain/submission-mapper";


// (Optional) keep mapping table here if you later transform reviewOutput → API attributes.
// Currently the submit flow posts `reviewOutput` as-is (license text response).
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

  const handleVerifyAndSubmit = useCallback(
    async (format: "license") => {
      if (!reviewOutput) return;
      const endpoint = `/drt/api/submission/?format=${format}`;
      try {
        const response = await fetchApi(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewOutput),
        });
        if (!response.ok)
          throw new Error(`Submission failed: ${response.status}`);

        const blob = await response.blob();
        const cd = response.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename="([^"]+)"/);
        const filename = match?.[1] || { license: "license.json" }[format];

        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Error during submission:", error);
      }
    },
    [reviewOutput]
  );

  return {
    reviewOutput,
    setReviewOutput,
    handleSubmit,
    handleVerifyAndSubmit,
  };
}
