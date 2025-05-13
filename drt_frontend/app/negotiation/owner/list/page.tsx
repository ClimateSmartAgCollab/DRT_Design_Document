"use client";

import React, { useEffect, useState } from "react";
import fetchApi from "@/app/api/apiHelper";

interface Negotiation {
  negotiation_id: string;
  state: string;
  // …other fields if you need them
}

const NegotiationList = () => {
  const [negs, setNegs] = useState<Negotiation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetchApi("/drt/negotiations/");
      if (!res.ok) throw new Error(res.statusText);
      const data: Negotiation[] = await res.json();
      setNegs(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load negotiations.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // single‐item actions
  const archiveOne = async (id: string) => {
    await fetchApi(`/drt/negotiations/archive/${id}/`);
    load();
  };
  const deleteOne = async (id: string) => {
    await fetchApi(`/drt/negotiations/delete/${id}/`);
    load();
  };

  // bulk action
  const deleteOld = async () => {
    await fetchApi("/drt/negotiations/delete_old/");
    load();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Negotiations</h1>
      {error && <p className="text-red-500">{error}</p>}

      <ul className="space-y-4 mb-6">
        {negs.map((n) => (
          <li key={n.negotiation_id} className="p-4 border rounded shadow flex justify-between items-center">
            <div>
              <strong>ID:</strong> {n.negotiation_id}<br />
              <strong>Status:</strong> {n.state}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => archiveOne(n.negotiation_id)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Archive
              </button>
              <button
                onClick={() => deleteOne(n.negotiation_id)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={deleteOld}
        className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
      >
        Delete Old Negotiations
      </button>
    </div>
  );
};

export default NegotiationList;
