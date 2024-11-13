// app/negotiation/owner/[link_id]/owner-review/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import fetchApi from '@/app/api/apiHelper';

type NegotiationData = {
  owner_responses: string | null;
  comments: string | null;
  requestor_responses: {
    [key: string]: string | boolean;
  };
  state: string;
};

const OwnerReviewPage = () => {
  const { link_id } = useParams();
  const [negotiation, setNegotiation] = useState<NegotiationData | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch negotiation data on load
  useEffect(() => {
    const fetchNegotiation = async () => {
      try {
        const response = await fetchApi(`/owner_review/${link_id}/`);
        const data = await response.json();

        if (response.ok) {
          setNegotiation(data);
        } else {
          setError(data || 'Failed to load negotiation details.');
        }
      } catch (err) {
        console.error('Fetch negotiation error:', err);
        setError('Failed to load negotiation details.');
      }
    };

    fetchNegotiation();
  }, [link_id]);

  // Handle different actions
  const handleAction = async (action: string) => {
    try {
      const formData = new FormData();
      formData.append('owner_responses', negotiation?.owner_responses || '');
      formData.append('comments', negotiation?.comments || '');
      formData.append(action, 'true'); // Action key in request.POST
      
      const response = await fetchApi(`/owner_review/${link_id}/`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (response.ok) {
        setStatusMessage(result.message);
        if (action === 'accept' || action === 'reject') {
          router.push('/negotiation/owner/success'); // Redirect after final actions
        }
      } else {
        setError(result.error || 'Action failed.');
      }
    } catch (err) {
      console.error('Action error:', err);
      setError('Failed to perform action.');
    }
  };

  // Input change handler
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNegotiation((prev) => prev ? { ...prev, [name]: value } : null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Owner Review</h2>

        {error ? (
          <p className="text-red-500">{error}</p>
        ) : negotiation ? (
          <>
            <div className="mb-4">
              <h3 className="text-xl font-semibold">Requestor Responses</h3>
              {typeof negotiation.requestor_responses === 'object' && negotiation.requestor_responses !== null ? (
                <div className="bg-gray-100 p-4 rounded">
                  {Object.entries(negotiation.requestor_responses).map(([key, value]) => (
                    <p key={key} className="mb-2">
                      <span className="font-semibold">{key}:</span> {String(value)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="bg-gray-100 p-4 rounded">No responses available</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="owner_responses" className="block text-gray-700">Owner Responses</label>
              <textarea
                id="owner_responses"
                name="owner_responses"
                value={negotiation.owner_responses ?? ''}
                onChange={handleChange}
                className="mt-1 p-2 border border-gray-300 rounded w-full"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="comments" className="block text-gray-700">Comments</label>
              <textarea
                id="comments"
                name="comments"
                value={negotiation.comments ?? ''}
                onChange={handleChange}
                className="mt-1 p-2 border border-gray-300 rounded w-full"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleAction('save')}
                className="bg-blue-500 text-white p-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => handleAction('request_clarification')}
                className="bg-yellow-500 text-white p-2 rounded"
              >
                Request Clarification
              </button>
              <button
                onClick={() => handleAction('accept')}
                className="bg-green-500 text-white p-2 rounded"
              >
                Accept
              </button>
              <button
                onClick={() => handleAction('reject')}
                className="bg-red-500 text-white p-2 rounded"
              >
                Reject
              </button>
            </div>

            {statusMessage && <p className="mt-4 text-green-500">{statusMessage}</p>}
          </>
        ) : (
          <p>Loading negotiation details...</p>
        )}
      </div>
    </div>
  );
};

export default OwnerReviewPage;
