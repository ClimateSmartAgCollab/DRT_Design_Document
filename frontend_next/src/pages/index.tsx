// src/pages/index.tsx
import React, { useState } from 'react';
import apiClient from '@/api/apiClient';

const HomePage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [link, setLink] = useState<string | null>(null);

  const generateLink = async () => {
    try {
      const response = await apiClient.post('/generate-link', { email });
      setLink(response.data.link);
    } catch (error) {
      console.error('Error generating link:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Generate Access Link</h1>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 mb-4 w-full"
      />
      <button onClick={generateLink} className="bg-blue-500 text-white p-2 rounded">
        Generate Link
      </button>
      {link && <p>Your access link: {link}</p>}
    </div>
  );
};

export default HomePage;
