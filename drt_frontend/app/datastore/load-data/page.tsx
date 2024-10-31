// app/datastore/load-data/page.tsx
'use client';

import React, { useState } from 'react';
import axios from 'axios';

const LoadDataPage = () => {
  const [status, setStatus] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const response = await axios.get('/api/load-data');
      setStatus(response.data.status);
    } catch (error) {
      console.error('Error loading data:', error);
      setStatus('Failed to load data');
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={loadData}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Load GitHub Data
      </button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default LoadDataPage;
