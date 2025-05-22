// drt_frontend\app\negotiation\owner\list\components\NegotiationItem.tsx
import React, { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Negotiation } from "../types";
import {
  archiveNegotiation,
  deleteNegotiation,
} from "../services/negotiationApi";
import Link from 'next/link';

interface NegotiationItemProps {
  negotiation: Negotiation;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onReload: () => void;
}

export function NegotiationItem({
  negotiation: n,
  isSelected,
  onToggleSelect,
  onReload,
}: NegotiationItemProps) {
  const shouldReduce = useReducedMotion();
  const [expanded, setExpanded] = React.useState(false);
  const canArchive =
    !n.archived && ["completed", "canceled", "rejected"].includes(n.state);

  const payload = useMemo(() => {
    if (!n.requestor_responses) return "";
    const { save, submit, ...rest } = n.requestor_responses;
    const key = Object.keys(rest)[0];
    return JSON.stringify(rest[key], null, 2);
  }, [n.requestor_responses]);

  const handleArchive = async () => {
    await archiveNegotiation(n.negotiation_id);
    onReload();
  };

  const handleDelete = async () => {
    await deleteNegotiation(n.negotiation_id);
    onReload();
  };

  return (
    <li className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center px-6 py-4 cursor-pointer hover:bg-gray-100 transition">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(n.negotiation_id)}
          className="mr-4 h-4 w-4 text-blue-600"
        />
        <div
          className="flex-1 flex flex-wrap gap-x-4 gap-y-1"
          onClick={() => setExpanded((e) => !e)}
        >
          <span className="font-semibold text-gray-800">
            ID: {n.negotiation_id}
          </span>
          <span className="text-gray-600">State: {n.state}</span>
          <span className="text-gray-600">
            Created: {new Date(n.timestamps).toLocaleDateString()}
          </span>
          <span className="text-gray-600">
            Archived: {n.archived ? "Yes" : "No"}
          </span>
          {n.state === 'owner_open' && n.owner_link && (
            <Link
              href={`/negotiation/owner/${n.owner_link}/owner-review`}
              className="ml-4 text-blue-600 underline hover:text-blue-800"
            >
              Access Your Review Link
            </Link>
          )}
        </div>
        <span className="text-xl text-gray-500">{expanded ? "▾" : "▸"}</span>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0 }}
            className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">
                  Requestor Responses
                </h4>
                <pre className="bg-white p-3 rounded-lg overflow-auto text-sm text-gray-700">
                  {payload}
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
            <div className="flex flex-wrap gap-2">
              {canArchive && (
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Archive
                </button>
              )}
              <button
                onClick={handleDelete}
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
}

export default React.memo(NegotiationItem);
