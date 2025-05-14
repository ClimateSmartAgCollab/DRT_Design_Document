"use client";

import React, { useEffect, useState } from "react";
import fetchApi from "@/app/api/apiHelper";
import { AnimatePresence, motion } from "framer-motion";

interface Negotiation {
  negotiation_id: string;
  state: string;
  conversation_id: string;
  requestor_responses: Record<string, any>;
  owner_responses: string[];
  comments: string[];
  timestamps: string;
  archived: boolean;
}

const NegotiationList = () => {
  const [negs, setNegs] = useState<Negotiation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

  const archiveOne = async (id: string) => {
    await fetchApi(`/drt/negotiations/archive/${id}/`);
    load();
  };
  const deleteOne = async (id: string) => {
    await fetchApi(`/drt/negotiations/delete/${id}/`);
    load();
  };
  const deleteOld = async () => {
    await fetchApi("/drt/negotiations/delete_old/");
    load();
  };

  const isArchiveable = (state: string, archived: boolean) =>
    !archived && ["completed", "canceled", "rejected"].includes(state);
  const isOlderThan30Days = (isoDate: string) => {
    return Date.now() - new Date(isoDate).getTime() > THIRTY_DAYS_MS;
  };
  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const hasOld = negs.some((n) => isOlderThan30Days(n.timestamps));

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-800">
        Negotiations
      </h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="mb-6 p-4 bg-blue-100 border-l-4 border-blue-500 rounded">
        <p className="text-gray-700">
          Only completed, canceled, or rejected negotiations can be archived.
        </p>
        <p className="text-gray-700">Delete negotiations older than 30 days.</p>
      </div>
      {hasOld && (
        <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded">
          <p className="text-gray-700">
            There are negotiations older than 30 days. You can delete them using
            the button below.
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {negs.map((n) => {
          const payload = (() => {
            if (!n.requestor_responses) return null;
            const { save, submit, ...rest } = n.requestor_responses;
            const firstKey = Object.keys(rest)[0];
            return rest[firstKey];
          })();

          const createdAt = n.timestamps;
          const canArchive = isArchiveable(n.state, n.archived);
          // const canDelete = isOlderThan30Days(createdAt);
          const isOpen = !!expanded[n.negotiation_id];

          return (
            <li
              key={n.negotiation_id}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="flex justify-between items-center px-6 py-4 cursor-pointer hover:bg-gray-100 transition"
                onClick={() => toggle(n.negotiation_id)}
              >
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-semibold text-gray-800">
                    ID: {n.negotiation_id}
                  </span>
                  <span className="text-gray-600">State: {n.state}</span>
                  <span className="text-gray-600">
                    Created: {new Date(createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-gray-600">
                    Archived: {n.archived ? "Yes" : "No"}
                  </span>
                </div>
                <span className="text-xl text-gray-500">
                  {isOpen ? "▾" : "▸"}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          Requestor Responses
                        </h4>
                        <pre className="bg-white p-3 rounded-lg overflow-auto text-sm text-gray-700">
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          Owner Responses
                        </h4>
                        <pre className="bg-white p-3 rounded-lg overflow-auto text-sm text-gray-700">
                          {JSON.stringify(n.owner_responses, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Comments
                      </h4>
                      <pre className="bg-white p-3 rounded-lg overflow-auto text-sm text-gray-700">
                        {JSON.stringify(n.comments, null, 2)}
                      </pre>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canArchive && (
                        <button
                          onClick={() => archiveOne(n.negotiation_id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          Archive
                        </button>
                      )}

                      <button
                        onClick={() => deleteOne(n.negotiation_id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      {hasOld && (
        <div className="mt-6">
          <button
            onClick={deleteOld}
            className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition"
          >
            Delete Old Negotiations
          </button>
        </div>
      )}
    </div>
  );
};

export default NegotiationList;
