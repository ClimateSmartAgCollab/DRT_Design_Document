// app/datastore/page.tsx
'use client';

import React, { useState } from 'react';
import axios from 'axios';
import CachedDataDisplay from '../components/CachedDataDisplay';

const FetchCachedDataPage = () => {
  const [key, setKey] = useState('');
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await axios.get(`/api/get_cached_data/${key}`);
      setData(response.data[key]);
      setError(null);
    } catch (error) {
      console.error('Error fetching cached data:', error);
      setData(null);
      setError('No cached data found for this key');
    }
  };

  return (
    <div className="p-6">
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Enter cache key (e.g., owner_table)"
        className="border p-2 rounded mr-2"
      />
      <button
        onClick={fetchData}
        className="bg-green-500 text-white px-4 py-2 rounded"
      >
        Fetch Cached Data
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
      {data && <CachedDataDisplay data={data} title={`Data for key: ${key}`} />}
    </div>
  );
};

export default FetchCachedDataPage;
