// app/datastore/load-data/page.tsx
'use client';

import React, { useState } from 'react';
import fetchApi from '@/app/api/apiHelper';

const LoadDataPage = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetchApi('/datastore/load-data/');
      const data = await response.json();
      setStatus(data.status || 'Data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      setStatus('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Load GitHub Data</h1>

        <button
          onClick={loadData}
          disabled={loading}
          className={`w-full px-4 py-2 font-semibold rounded-lg transition-colors duration-200 ${
            loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {loading ? 'Loading...' : 'Load Data'}
        </button>

        {status && (
          <p
            className={`mt-4 text-lg font-medium ${
              status === 'Failed to load data' ? 'text-red-500' : 'text-green-500'
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadDataPage;
