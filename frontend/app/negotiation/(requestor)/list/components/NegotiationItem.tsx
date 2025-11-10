// drt_frontend\app\negotiation\(requestor)\list\components\NegotiationItem.tsx
import React from "react";
import type { Negotiation } from "../types";
import { STATUS_DISPLAY_NAMES } from "../types";
import {
  abandonNegotiation,
} from "../services/negotiationApi";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";

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
  const canArchive =
    !n.archived && ["accepted", "abandoned", "rejected"].includes(n.state);
  
  const canAbandon = !n.archived && ["requestor_open", "owner_open"].includes(n.state);
  
  const abandonMutation = useMutation({
    mutationFn: () => abandonNegotiation(n.negotiation_id),
    onSuccess: () => {
      onReload();
    },
    onError: (error) => {
      console.error("Failed to abandon negotiation:", error);
      alert("Failed to abandon negotiation. Please try again.");
    },
  });


  // const handleArchive = async () => {
  //   await archiveNegotiation(n.negotiation_id);
  //   onReload();
  // };

  // const handleDelete = async () => {
  //   await deleteNegotiation(n.negotiation_id);
  //   onReload();
  // };

  return (
    <li className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(n.negotiation_id)}
            className="mr-4 h-4 w-4 text-blue-600"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (n.requestor_link) {
                  window.open(`/negotiation/history/${n.requestor_link}`, '_blank');
                } else {
                  alert('History not available for this negotiation');
                }
              }}
              className="font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              title="View negotiation history"
            >
              ID: {n.negotiation_id}
            </button>
            <span className="text-gray-600">State: {STATUS_DISPLAY_NAMES[n.state as keyof typeof STATUS_DISPLAY_NAMES] || n.state}</span>
            <span className="text-gray-600">
              Created: {new Date(n.timestamps).toLocaleDateString()}
            </span>
            {n.state === "requestor_open" && n.requestor_link && (
              <Link
                href={`/negotiation/${n.requestor_link}/fill-questionnaire`}
                className="ml-4 text-blue-600 underline hover:text-blue-800"
                target="_blank"
                rel="noopener noreferrer"
              >
                Access Your Review Link
              </Link>
            )}
          </div>
        </div>
        
        {/* Action buttons displayed directly below the ID */}
        <div className="flex flex-wrap gap-2 ml-8">
          {canAbandon && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to cancel this negotiation? This action cannot be undone.")) {
                  abandonMutation.mutate();
                }
              }}
              disabled={abandonMutation.isPending}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {abandonMutation.isPending ? "Canceling..." : "Cancel Request"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default React.memo(NegotiationItem);
