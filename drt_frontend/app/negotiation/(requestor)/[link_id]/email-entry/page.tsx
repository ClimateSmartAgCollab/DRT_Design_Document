// app/negotiation/[link_id]/email-entry/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import fetchApi from '@/app/api/apiHelper';

const EmailEntry = () => {
  console.log("EmailEntry");
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { link_id } = useParams(); // Access `link_id` with `useParams`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation for email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      // Make the API call using fetchApi with POST method
      const response = await fetchApi(`/verify/requestor/${link_id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      // Check if the response was successful
      if (response.ok) {
        // Redirect to OTP verification page on success
        router.push(`/negotiation/${link_id}/otp-verification`);
      } else {
        // Parse JSON only if status is not ok
        const data = await response.json();
        setError(data.error || 'An error occurred. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Email entry error:', err);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-black">Enter Your Email</h2>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null); // Clear error when user starts typing again
          }}
          placeholder="Enter email"
          required
          className="w-full p-2 mb-4 border border-gray-300 rounded text-black"
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
          Submit
        </button>
      </form>
    </div>
  );
};

export default EmailEntry;
