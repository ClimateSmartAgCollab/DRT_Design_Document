// app/negotiation/owner/[link_id]/owner-review/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";

// Re-use the exact same form-schema logic as your Form.tsx:
import { parseJsonToFormStructure } from "../../../../components/parser";
import { sortStepsByReferences } from "../../../../components/Form/hooks/useDynamicForm";
import { Step, Field } from "../../../../components/type";

type NegotiationData = {
  owner_responses: string | null; // we’ll JSON.stringify per-field comments into this
  comments: string | null; // your existing global comments
  requestor_responses: { [key: string]: any }; // now accepts strings, arrays, etc.
  state: string;
};

export default function OwnerReviewPage() {
  const { link_id } = useParams();
  const router = useRouter();

  const [negotiation, setNegotiation] = useState<NegotiationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // per-field comments
  const [fieldComments, setFieldComments] = useState<Record<string, string>>(
    {}
  );
  // global comments
  const [globalComments, setGlobalComments] = useState<string>("");

  // 1️⃣ Build parsedSteps exactly as in your Form.tsx
  const parsedSteps = useMemo(() => {
    const unsorted = parseJsonToFormStructure();
    return sortStepsByReferences(unsorted);
  }, []);

  // 2️⃣ Fetch negotiation + preload comments
  useEffect(() => {
    async function fetchNegotiation() {
      try {
        const res = await fetchApi(`/drt/owner_review/${link_id}/`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Load failed");

        setNegotiation(data);
        setGlobalComments(data.comments || "");

        // if owner_responses arrived as JSON of comments, parse it
        if (data.owner_responses) {
          try {
            setFieldComments(JSON.parse(data.owner_responses));
          } catch {
            // ignore
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load negotiation.");
      }
    }
    fetchNegotiation();
  }, [link_id]);

  // 3️⃣ Filter only “parent” steps (skip child/ref steps)
  const parentSteps = useMemo(() => {
    const childIds = new Set<string>();
    parsedSteps.forEach((step) =>
      step.pages.forEach((page) =>
        page.sections.forEach((sec) =>
          sec.fields.forEach((f) => f.ref && childIds.add(f.ref))
        )
      )
    );
    return parsedSteps.filter((s) => !childIds.has(s.id));
  }, [parsedSteps]);

  // 4️⃣ Action handler: bundle fieldComments + globalComments + action flag
  const handleAction = async (action: string) => {
    if (!negotiation) return;
    setError(null);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("owner_responses", JSON.stringify(fieldComments));
      formData.append("comments", globalComments);
      formData.append(action, "true");

      const res = await fetchApi(`/drt/owner_review/${link_id}/`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Action failed");

      setStatusMessage(result.message);
      if (action === "accept" || action === "reject") {
        router.push("/negotiation/owner/success");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to perform action.");
    }
  };

  if (error) return <div className="p-6 text-red-500 text-center">{error}</div>;
  if (!negotiation) return <div className="p-6 text-center">Loading…</div>;

  return (
    <div className="flex items-start justify-center min-h-screen bg-gray-50 py-8">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-3xl space-y-6">
        <h2 className="text-2xl font-bold">Owner Review</h2>

        {/* ─── Render each question + answer + owner comment box ─── */}
        {parentSteps.map((step) => (
          <section key={step.id} className="space-y-4">
            {step.title && (
              <h3 className="text-xl font-semibold">{step.title.eng}</h3>
            )}

            {step.pages.map((page) =>
              page.sections.map((sec) => (
                <div
                  key={sec.sectionKey}
                  className="pl-4 border-l-2 border-gray-200"
                >
                  <h4 className="text-lg font-medium mb-2">
                    {sec.sectionLabel.eng}
                  </h4>

                  {sec.fields.map((field: Field) => {


                    const { save, submit, ...rest } =
                      negotiation.requestor_responses;

                    const flat = Object.entries(rest).reduce(
                      (acc: Record<string, any>, [key, val]) => {
                        if (
                          val != null &&
                          typeof val === "object" &&
                          !Array.isArray(val)
                        ) {
                          return { ...acc, ...val };
                        } else {
                          acc[key] = val;
                          return acc;
                        }
                      },
                      {} as Record<string, any>
                    );

                    const answer = flat[field.id];
                    console.log("answer for", field.id, "=>", answer);

                    console.log("Field ID:", field.id); // Debugging line

                    

                    return (
                      <div key={field.id} className="mb-4">
                        <label className="block font-medium mb-1">
                          {field.labels.eng?.[field.id] || field.id}
                        </label>

                        <div className="p-2 bg-gray-100 rounded mb-2 break-words">
                          {Array.isArray(answer)
                            ? answer.join(", ")
                            : String(answer ?? "—")}
                        </div>

                        <textarea
                          placeholder="Owner comment…"
                          value={fieldComments[field.id] || ""}
                          onChange={(e) =>
                            setFieldComments((prev) => ({
                              ...prev,
                              [field.id]: e.target.value,
                            }))
                          }
                          className="w-full border rounded p-2"
                        />
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </section>
        ))}

        {/* ──────────────────────────────────────────────────────────── */}

        {/* Global Comments (unchanged) */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">
            Comments
          </label>
          <textarea
            value={globalComments}
            onChange={(e) => setGlobalComments(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => handleAction("save")}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            onClick={() => handleAction("request_clarification")}
            className="bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Request Clarification
          </button>
          <button
            onClick={() => handleAction("accept")}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Accept
          </button>
          <button
            onClick={() => handleAction("reject")}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Reject
          </button>
        </div>

        {statusMessage && (
          <p className="mt-4 text-green-600">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
