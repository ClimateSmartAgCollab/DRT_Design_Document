// app/negotiation/list/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import fetchApi from '@/app/api/apiHelper';

interface Negotiation {
  id: number;
  state: string;
  [key: string]: any; // Allows for additional properties if needed
}

const NegotiationList = () => {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNegotiations = async () => {
      try {
        const response = await fetchApi('/negotiations/');
        if (response.ok) {
          const data = await response.json();
          setNegotiations(data);
        } else {
          setError('Failed to load negotiations. Please try again later.');
        }
      } catch (err) {
        console.error('Error fetching negotiations:', err);
        setError('An error occurred while loading negotiations.');
      }
    };
    fetchNegotiations();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Negotiations</h1>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <ul className="space-y-4">
          {negotiations.map((negotiation) => (
            <li key={negotiation.id} className="p-4 border rounded shadow">
              <h2 className="text-lg font-semibold">Negotiation ID: {negotiation.id}</h2>
              <p>Status: {negotiation.state}</p>
              {/* Add more negotiation details here if necessary */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NegotiationList;
