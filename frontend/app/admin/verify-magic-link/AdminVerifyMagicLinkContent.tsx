"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function AdminVerifyMagicLinkContent() {
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
        const response = await fetchApi('/drt/admin/verify-magic-link/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
          credentials: 'include', 
        });

        if (response.ok) {
          const responseData = await response.json();
          setStatus('success');
          queryClient.invalidateQueries({ queryKey: ['admin'] });
          setTimeout(() => {
            // If there's a target URL, redirect to it, otherwise go to homepage
            const targetUrl = responseData.target_url || '/admin/homepage';
            router.push(targetUrl);
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
      <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <section className="bg-white w-full max-w-sm p-6 rounded-xl shadow-lg text-center space-y-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(180,230,160,0.3)] animate-pulse">
            <svg
              className="h-6 w-6 text-[rgb(70,160,35)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Verifying Admin Access...
          </h1>
          <p className="text-gray-600">Please wait while we verify your access link.</p>
        </section>
      </main>
    );
  }

  if (status === 'success') {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <section className="bg-white w-full max-w-sm p-6 rounded-xl shadow-lg text-center space-y-6">
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
            Access Verified!
          </h1>
          <p className="text-gray-600">Redirecting to admin dashboard...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <section className="bg-white w-full max-w-sm p-6 rounded-xl shadow-lg text-center space-y-6">
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
        <p className="text-red-600">{errorMessage}</p>
        <button
          onClick={() => router.push('/admin/email-entry')}
          className="w-full rounded-lg px-4 py-2 font-medium text-white bg-[rgb(70,160,35)] hover:bg-[rgb(55,125,28)] transition"
        >
          Request New Access Link
        </button>
      </section>
    </main>
  );
}
