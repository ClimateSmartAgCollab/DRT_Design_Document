"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

function VerifyMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid access link. Missing required parameters.');
      return;
    }

    const verifyMagicLink = async () => {
      try {
        // First contact with Django: fetch the CSRF cookie so the POST below
        // can send a valid X-CSRFToken header.
        await fetchApi('/drt/auth/csrf/');
        const response = await fetchApi('/drt/auth/verify-req-magic-link/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setStatus('success');
          // Invalidate any cached user data
          queryClient.invalidateQueries({ queryKey: ['requestor'] });
          // Redirect to requestor dashboard after a short delay
          setTimeout(() => {
            router.push('/negotiation/homepage');
          }, 1000);
        } else {
          const errorData = await response.json();
          setStatus('error');
          setErrorMessage(errorData.error || 'Verification failed');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Network error. Please try again.');
      }
    };

    verifyMagicLink();
  }, [token, router, queryClient]);

  if (status === 'verifying') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(70,160,35)] mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your access link...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Verification Successful!</h1>
          <p className="text-gray-600 mb-4">You have been successfully verified.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-red-600 text-6xl mb-4">✗</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h1>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        <button
          onClick={() => router.push('/negotiation/email-entry')}
          className="bg-[rgb(70,160,35)] text-white px-6 py-2 rounded-lg hover:bg-[rgb(55,125,28)] transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function RequestorVerifyMagicLink() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyMagicLinkContent />
    </Suspense>
  );
} 