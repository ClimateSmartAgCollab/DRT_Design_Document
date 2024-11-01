// app/negotiation/[link_id]/request-access.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/app/api/apiHelper';

const RequestAccessPage = () => {
  const [accessLink, setAccessLink] = useState<string | null>(null);
  const { link_id } = useParams(); // Access `link_id` with `useParams`

  useEffect(() => {
    const fetchAccessLink = async () => {
      try {
        const response = await api.get(`/request_access/${link_id}/`);
        setAccessLink(response.data.link);
      } catch (err) {
        console.error('Access request error:', err);
      }
    };
    fetchAccessLink();
  }, [link_id]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded shadow-md text-center w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Access Granted</h2>
        {accessLink ? (
          <p>
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
