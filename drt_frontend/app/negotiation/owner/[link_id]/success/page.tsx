// drt_frontend/app/negotiation/owner/[link_id]/success/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";


export default function SuccessPage() {
  const { link_id } = useParams();
  const [requestorResponses, setRequestorResponses] = useState<Record<
    string,
    any
  > | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load the stored requestor_responses when the page mounts
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetchApi(`/drt/owner_review/${link_id}/?success=true`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load data");

        // If your backend is returning a string, parse it; otherwise assume it's already an object
        const parsed =
          typeof data.requestor_responses === "string"
            ? JSON.parse(data.requestor_responses)
            : data.requestor_responses;
        setRequestorResponses(parsed);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || "Error fetching negotiation data");
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [link_id]);

  // Allow the owner to resend the email
  const handleResendEmail = async () => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const form = new FormData();
      form.append("resend", "true");
      const res = await fetchApi(`/drt/owner_review/${link_id}/`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Resend failed");
      setStatusMessage("✅ Email resent! Please check your inbox.");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to resend email.");
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Thank you!</h1>
        <p>Your acceptance has been recorded.</p>
        <p>Please check your email for the license agreement.</p>

        <button
          onClick={handleResendEmail}
          className="mt-2 inline-block px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Didn’t get it? Resend Email
        </button>

        {statusMessage && (
          <p className="mt-4 text-green-600">{statusMessage}</p>
        )}
        {errorMessage && <p className="mt-4 text-red-600">{errorMessage}</p>}

        {/* <Link
          href="/"
          className="mt-4 inline-block px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
        >
          Back to Home
        </Link> */}
      </div>
    </div>
  );
}
