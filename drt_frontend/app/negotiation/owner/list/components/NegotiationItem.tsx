// drt_frontend\app\negotiation\owner\list\components\NegotiationItem.tsx
import React from "react";
import type { Negotiation } from "../types";
import { STATUS_DISPLAY_NAMES } from "../types";
import {
  deleteNegotiation,
  regenerateLicense,
  reopenNegotiation,
} from "../services/negotiationApi";
import Link from "next/link";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

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

  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isReopening, setIsReopening] = React.useState(false);
  // const canArchive =
  //   !n.archived && ["accepted", "abandoned", "rejected"].includes(n.state);



  // const handleArchive = async () => {
  //   await archiveNegotiation(n.negotiation_id);
  //   onReload();
  // };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await deleteNegotiation(n.negotiation_id);
      onReload();
    } catch (error) {
      console.error('Error deleting negotiation:', error);
      alert('Failed to delete negotiation. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleRegenerateLicense = async () => {
    try {
      setIsRegenerating(true);
      const blob = await regenerateLicense(n.negotiation_id);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `license_negotiation_id:${n.negotiation_id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error regenerating license:', error);
      alert('Failed to regenerate license. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleReopen = async () => {
    try {
      setIsReopening(true);
      await reopenNegotiation(n.negotiation_id);
      alert('Negotiation reopened successfully!');
      onReload(); // Refresh the list to show updated state
    } catch (error) {
      console.error('Error reopening negotiation:', error);
      alert('Failed to reopen negotiation. Please try again.');
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <li className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(n.negotiation_id)}
            className="mr-4 h-4 w-4 text-blue-600"
            onClick={e => e.stopPropagation()}
          />
          <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (n.owner_link) {
                  window.open(`/negotiation/owner/history/${n.owner_link}`, '_blank');
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
            {n.tags && n.tags.length > 0 && (
              <span className="flex items-center gap-1">
                {Array.isArray(n.tags)
                  ? n.tags.map((tag, idx) => (
                      <span
                        key={tag + idx}
                        className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200"
                      >
                        {tag}
                      </span>
                    ))
                  : (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                        {n.tags}
                      </span>
                    )}
              </span>
            )}
            {n.record_label && (
              <span className="ml-2 inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded border border-green-200">
                Record Label: {n.record_label}
              </span>
            )}
            {n.state === "owner_open" && n.owner_link && (
              <Link
                href={`/negotiation/owner/${n.owner_link}/owner-review`}
                className="ml-4 text-blue-600 underline hover:text-blue-800"
              >
                Access Your Review Link
              </Link>
            )}
          </div>
        </div>
        
        {/* Action buttons displayed directly below the ID */}
        <div className="flex flex-wrap gap-2 ml-8">
          {n.state === "accepted" && (
            <button
              onClick={handleRegenerateLicense}
              disabled={isRegenerating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? "Generating..." : "Regenerate License"}
            </button>
          )}
          {(n.state === "accepted" || n.state === "rejected" || n.state === "abandoned") && (
            <button
              onClick={handleReopen}
              disabled={isReopening}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReopening ? "Reopening..." : "Reopen"}
            </button>
          )}
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Negotiation"
        message={`Are you sure you want to delete negotiation "${n.negotiation_id}"?`}
        isLoading={isDeleting}
      />
    </li>
  );
}

export default React.memo(NegotiationItem);
