// app/negotiation/[link_id]/otp-verification/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import fetchApi from '@/app/api/apiHelper';

const OTPVerification = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { link_id } = useParams();

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Make API call to verify OTP
      const response = await fetchApi(`/drt/verify/otp/${link_id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otp }),
      });

      // Check if the response contains an error message
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Invalid OTP. Please try again.');
      } else {
        // Redirect to the next page if OTP is valid
        router.push(`/negotiation/${link_id}/request-access`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('OTP verification error:', err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleOTPSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-black">Enter OTP</h2>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="text"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value);
            setError(null); // Clear error when user starts typing again
          }}
          placeholder="Enter OTP"
          required
          className="w-full p-2 mb-4 border border-gray-300 rounded text-black"
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
          Verify OTP
        </button>
      </form>
    </div>
  );
};

export default OTPVerification;
