// app/negotiation/generate-link/[link_id]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/app/api/apiHelper';

const GenerateLinkPage = () => {
  const router = useRouter();
  const { link_id } = useParams();
  const [error, setError] = useState<string | null>(null);

  const generateLink = async () => {
    try {
      // Call the Django backend to generate the link
      const response = await api.get(`/generate_nlinks/${link_id}/`);

      // Check for `requestor_link_id` in the response
      if (response.data && response.data.requestor_link_id) {
        const requestorLinkId = response.data.requestor_link_id;
        router.push(`/negotiation/${requestorLinkId}/email-entry`);
      } else {
        throw new Error('Invalid response format or missing requestor_link_id');
      }
    } catch (err) {
      console.error('Error during link generation:', err);
      setError('Failed to generate link. Please try again later.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <button
        onClick={generateLink}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg"
      >
        Generate Access Link for Requestor
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default GenerateLinkPage;
