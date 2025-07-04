"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";

export default function MagicLinkVerificationPage() {
  const { link_id: linkId } = useParams<{ link_id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token ) {
      setStatus('error');
      setErrorMessage('Invalid access link. The link is missing required parameters. Please use the link sent to your email.');
      return;
    }

    const verifyMagicLink = async () => {
      try {
        const response = await fetchApi(`/drt/verify/magic-link/${linkId}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({token}),
        });

        if (response.ok) {
          setStatus('success');
          // Redirect to request access page after a short delay
          setTimeout(() => {
            router.push(`/negotiation/${linkId}/request-access`);
          }, 2000);
        } else {
          const errorData = await response.json();
          setStatus('error');
          setErrorMessage(errorData.error || 'Verification failed');
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('Network error. Please try again.');
      }
    };

    verifyMagicLink();
  }, [token, router, linkId]);

  if (status === 'verifying') {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <section className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg text-center space-y-6">
          {/* Loading Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          <h1 className="text-2xl font-semibold text-gray-800">
            Verifying Access Link
          </h1>
          <p className="text-gray-600">Please wait while we verify your access link...</p>
        </section>
      </main>
    );
  }

  if (status === 'success') {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <section className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg text-center space-y-6">
          {/* Success Icon */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-gray-800">
            Verification Successful!
          </h1>
          <p className="text-gray-600">You have been successfully verified.</p>
          <p className="text-sm text-gray-500">Redirecting to questionnaire...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <section className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg text-center space-y-6">
        {/* Error Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-800">
          Verification Failed
        </h1>
        <p className="text-gray-600">{errorMessage}</p>
        <button
          onClick={() => router.push(`/negotiation/${linkId}/email-entry`)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </section>
    </main>
  );
} 