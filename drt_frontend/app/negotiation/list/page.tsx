// app/negotiation/list/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import api from '@/app/api/apiHelper';

const NegotiationList = () => {
  const [negotiations, setNegotiations] = useState<any[]>([]);

  useEffect(() => {
    const fetchNegotiations = async () => {
      const { data } = await api.get('/negotiations/');
      setNegotiations(data);
    };
    fetchNegotiations();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Negotiations</h1>
      <ul className="space-y-4">
        {negotiations.map((negotiation) => (
          <li key={negotiation.id} className="p-4 border rounded shadow">
            <h2 className="text-lg font-semibold">Negotiation ID: {negotiation.id}</h2>
            <p>Status: {negotiation.state}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NegotiationList;
