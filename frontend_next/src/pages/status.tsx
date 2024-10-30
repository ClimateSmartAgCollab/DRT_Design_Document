// src/pages/status.tsx
import React from 'react';
import { useRouter } from 'next/router';
import useFetchStatus from '@/hooks/useFetchStatus';

const StatusPage: React.FC = () => {
  const router = useRouter();
  const { requestId } = router.query;
  const { status, loading, error } = useFetchStatus(requestId as string);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Request Status</h1>
      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      {status && <p>Status: {status}</p>}
    </div>
  );
};

export default StatusPage;
