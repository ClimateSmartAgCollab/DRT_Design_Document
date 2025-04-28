// app/negotiation/[link_id]/fill-questionnaire/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";
import Form from "../../../../components/Form/Form";

export default function FillQuestionnairePage() {
  const { link_id } = useParams();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchApi(`/drt/fill_questionnaire/${link_id}/`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Load failed");
        if (data.saved_responses) setAnswers(data.saved_responses);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
    }
    load();
  }, [link_id]);

  const submitForm = async (isSubmit: boolean) => {
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetchApi(`/drt/fill_questionnaire/${link_id}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, submit: isSubmit, save: !isSubmit }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submit failed");
      setStatusMessage(
        isSubmit
          ? "Questionnaire submitted for review."
          : "Questionnaire saved successfully."
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-3xl p-4">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {statusMessage && (
          <p className="text-green-500 mb-4">{statusMessage}</p>
        )}
        <Form
          initialAnswers={answers}
          onSave={(newAnswers) => {
            setAnswers(newAnswers);
            submitForm(false);
          }}
          onSubmit={(newAnswers) => {
            setAnswers(newAnswers);
            submitForm(true);
          }}
        />
      </div>
    </div>
  );
}
