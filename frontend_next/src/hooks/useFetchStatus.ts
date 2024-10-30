// src/hooks/useFetchStatus.ts
import { useEffect, useState } from 'react';
import apiClient from '@/api/apiClient';

const useFetchStatus = (requestId: string) => {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await apiClient.get(`/status/${requestId}`);
        setStatus(response.data.status);
      } catch (error) {
        setError('Error fetching status');
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [requestId]);

  return { status, loading, error };
};

export default useFetchStatus;
