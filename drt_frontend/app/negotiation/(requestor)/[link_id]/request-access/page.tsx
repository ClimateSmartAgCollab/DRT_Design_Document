// app/negotiation/[link_id]/request-access.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import fetchApi from '@/app/api/apiHelper';

const RequestAccessPage = () => {
  const [accessLink, setAccessLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { link_id } = useParams();

  useEffect(() => {
    const fetchAccessLink = async () => {
      try {
        const response = await fetchApi(`/request_access/${link_id}/`);
        if (response.ok) {
          const data = await response.json();
          setAccessLink(`/negotiation/${link_id}/fill-questionnaire`);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load access link.');
        }
      } catch (err) {
        console.error('Access request error:', err);
        setError('Failed to load access link.');
      }
    };
    fetchAccessLink();
  }, [link_id]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded shadow-md text-center w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-black">Access Granted</h2>
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : accessLink ? (
          <p className="text-gray-700">
            You can now proceed to the questionnaire at: <br />
            <a href={accessLink} className="text-blue-500 underline">
              {accessLink}
            </a>
          </p>
        ) : (
          <p>Loading access link...</p>
        )}
      </div>
    </div>
  );
};

export default RequestAccessPage;
