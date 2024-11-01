// app/negotiation/[link_id]/email-entry.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/app/api/apiHelper';

const EmailEntry = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { link_id } = useParams(); // Access `link_id` with `useParams`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Adjust API endpoint path to match the backend
      await api.post(`/verify/requestor/${link_id}/`, { email });
      router.push(`/negotiation/${link_id}/otp-verification`);
    } catch (err) {
      setError('Please enter a valid email address.');
      console.error('Email entry error:', err);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Enter Your Email</h2>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
          required
          className="w-full p-2 mb-4 border border-gray-300 rounded"
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
          Submit
        </button>
      </form>
    </div>
  );
};

export default EmailEntry;
