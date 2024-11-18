'use client';

import React, { useState } from 'react';
import fetchApi from '@/app/api/apiHelper';

const FetchCachedDataPage = () => {
  const [key, setKey] = useState('');
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetchApi(`/datastore/get_cached_data/${key}/`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'No cached data found for this key');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching cached data:', err);
      setError(err.message || 'Failed to fetch cached data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Fetch Cached Data</h1>

        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter cache key (e.g., owner_table)"
            className="border border-gray-300 p-3 rounded-lg flex-grow focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
          />
          <button
            onClick={fetchData}
            disabled={!key || loading}
            className={`px-4 py-2 font-semibold rounded-lg transition-colors duration-200 ${
              loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            {loading ? 'Loading...' : 'Fetch'}
          </button>
        </div>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

        {data && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-700 mb-4">
              Data for key: {key}
            </h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-64 text-gray-800 mb-6">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default FetchCachedDataPage;
