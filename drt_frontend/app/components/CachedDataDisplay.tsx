// app/components/CachedDataDisplay.tsx
import React from 'react';

type CachedDataDisplayProps = {
  data: Record<string, any>;
  title: string;
};

const CachedDataDisplay: React.FC<CachedDataDisplayProps> = ({ data, title }) => (
  <div className="border border-gray-300 rounded p-4 shadow-sm">
    <h2 className="text-lg font-semibold mb-2">{title}</h2>
    <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

export default CachedDataDisplay;
