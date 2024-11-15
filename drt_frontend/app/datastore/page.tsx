// app/datastore/page.tsx
'use client';

import React, { useState } from 'react';
import axios from 'axios';
import CachedDataDisplay from '../components/CachedDataDisplay';

interface CachedDataResponse {
  [key: string]: Record<string, any>;
}

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
      const response = await axios.get<CachedDataResponse>(`/api/get_cached_data/${key}`);
      setData(response.data[key] || null);
    } catch (err) {
      console.error('Error fetching cached data:', err);
      setError('No cached data found for this key');
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
        {data && <CachedDataDisplay data={data} title={`Data for key: ${key}`} />}
      </div>
    </div>
  );
};

export default FetchCachedDataPage;
