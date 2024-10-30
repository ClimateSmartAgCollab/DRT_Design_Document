// src/pages/verify.tsx
import React, { useState } from 'react';
import apiClient from '@/api/apiClient';

const VerifyPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');

  const verifyOtp = async () => {
    try {
      const response = await apiClient.post('/verify', { otp });
      setMessage('OTP Verified successfully');
    } catch (error) {
      setMessage('Invalid OTP');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Verify OTP</h1>
      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        className="border p-2 mb-4 w-full"
      />
      <button onClick={verifyOtp} className="bg-blue-500 text-white p-2 rounded">
        Verify OTP
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default VerifyPage;
