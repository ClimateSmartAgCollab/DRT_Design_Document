// app/components/CachedDataDisplay.tsx
import React from 'react';

type CachedDataDisplayProps = {
  data: Record<string, any>;
  title: string;
};

const CachedDataDisplay: React.FC<CachedDataDisplayProps> = ({ data, title }) => (
  <div className="border border-gray-200 rounded-lg p-5 shadow-md bg-white max-w-2xl mx-auto mt-6">
    <h2 className="text-xl font-semibold mb-4 text-gray-700">{title}</h2>
    <pre className="text-sm bg-gray-50 p-4 rounded-lg shadow-inner overflow-x-auto whitespace-pre-wrap break-all font-mono text-black">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

export default CachedDataDisplay;
