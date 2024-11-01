// app/negotiation/[link_id]/otp-verification.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/app/api/apiHelper';

const OtpVerification = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { link_id } = useParams(); // Access `link_id` with `useParams`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/verify/otp/${link_id}/`, { otp });
      router.push(`/negotiation/${link_id}/request-access`);
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      console.error('OTP verification error:', err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Verify OTP</h2>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
          required
          className="w-full p-2 mb-4 border border-gray-300 rounded"
        />
        <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">
          Verify OTP
        </button>
      </form>
    </div>
  );
};

export default OtpVerification;
