// app/negotiation/[link_id]/fill-questionnaire/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";
import Form from "../../../../components/Form/Form";

export default function FillQuestionnairePage() {
  const { link_id } = useParams();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownerComments, setOwnerComments] = useState<Record<string, string>>(
    {}
  );
  const [globalOwnerComments, setGlobalOwnerComments] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchApi(`/drt/fill_questionnaire/${link_id}/`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Load failed");
        if (data.saved_responses) setAnswers(data.saved_responses);
        if (data.owner_responses) {
          try {
            setOwnerComments(JSON.parse(data.owner_responses));
          } catch {
            /* ignore parse errors for now*/
          }
        }
        if (data.comments) {
          setGlobalOwnerComments(data.comments);
        }
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
      if (!isSubmit) {
          setStatusMessage("Questionnaire saved successfully.");
          return;
        }
  
        router.push(
          `/negotiation/${link_id}/fill-questionnaire/success`
        );
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <>
      {/* Toast at top-center */}
      {statusMessage && (
        <div className="fixed top-4 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className="bg-green-500 text-white px-6 py-2 rounded shadow-lg">
            {statusMessage}
          </div>
        </div>
      )}

      {/* keep your centering if you still want the form in the middle */}
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-3xl p-4">
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Form
            initialAnswers={answers}
            ownerComments={ownerComments}
            globalOwnerComments={globalOwnerComments}
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
    </>
  );
}
