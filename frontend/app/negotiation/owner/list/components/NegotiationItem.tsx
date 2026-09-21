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
import { FulfillmentActions, FulfillmentBadge } from "./FulfillmentActions";
import { TagChip } from "../../components/TagChip";

interface NegotiationItemProps {
  negotiation: Negotiation;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onReload: () => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export function NegotiationItem({
  negotiation: n,
  isSelected,
  onToggleSelect,
  onReload,
  selectedTags,
  onToggleTag,
}: NegotiationItemProps) {

  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isReopening, setIsReopening] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
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
      onReload();
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

  const displayTitle = n.visible_label || n.record_label || n.negotiation_id;
  const displaySubtext = [
    n.requestor_email,
    new Date(n.timestamps).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  ]
    .filter(Boolean)
    .join(" · ");

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(n.negotiation_id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <li className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4">
        <div className="flex items-start mb-4 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(n.negotiation_id)}
            className="mr-4 mt-1 h-4 w-4 shrink-0 text-[rgb(70,160,35)]"
            onClick={e => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0 flex flex-wrap gap-x-4 gap-y-1 items-center">
            <div className="flex flex-col min-w-0 max-w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (n.owner_link) {
                    window.open(`/negotiation/owner/history/${n.owner_link}`, '_blank');
                  } else {
                    alert('History not available for this negotiation');
                  }
                }}
                className="font-semibold text-[rgb(70,160,35)] hover:text-[rgb(55,125,28)] underline cursor-pointer text-left"
                title="View negotiation history"
              >
                <span className="block">{displayTitle}</span>
                {displaySubtext && (
                  <span className="block text-sm font-normal text-gray-500 mt-0.5">
                    {displaySubtext}
                  </span>
                )}
              </button>
              <div className="flex items-start gap-1.5 mt-0.5 self-start min-w-0 w-full">
                <span className="text-xs text-gray-600 font-mono min-w-0 break-all">
                  <span className="font-medium text-gray-700">Negotiation ID:</span> {n.negotiation_id}
                </span>
                <button
                  onClick={handleCopyId}
                  className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
                  title="Copy ID"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <span className="text-gray-600">State: {STATUS_DISPLAY_NAMES[n.state as keyof typeof STATUS_DISPLAY_NAMES] || n.state}</span>
            {n.state === "accepted" && (
              <FulfillmentBadge status={n.fulfillment_status} />
            )}
            {n.state === "accepted" && n.fulfillment_note && (
              <span className="text-xs text-gray-500">
                Note: {n.fulfillment_note}
              </span>
            )}
            <span className="text-gray-600">
              Created: {new Date(n.timestamps).toLocaleDateString()}
            </span>
            {Array.isArray(n.tags) && n.tags.length > 0 && (
              <span className="flex items-center gap-1 flex-wrap">
                {n.tags.map((tag) => (
                  <TagChip
                    key={tag}
                    tag={tag}
                    pressed={selectedTags.includes(tag)}
                    onToggle={onToggleTag}
                  />
                ))}
              </span>
            )}
            {n.record_label && (
              <span className="ml-2 inline-block bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] text-xs font-semibold px-2 py-0.5 rounded border border-[rgb(55,125,28)]">
                Record Label: {n.record_label}
              </span>
            )}
            {n.state === "owner_open" && n.owner_link && (
              <Link
                href={`/negotiation/owner/${n.owner_link}/owner-review`}
                className="ml-4 text-[rgb(70,160,35)] underline hover:text-[rgb(55,125,28)]"
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
          <FulfillmentActions
            negotiationId={n.negotiation_id}
            state={n.state}
            fulfillmentStatus={n.fulfillment_status}
            onUpdated={onReload}
          />
          {(n.state === "accepted" || n.state === "rejected" || n.state === "abandoned") && (
            <button
              onClick={handleReopen}
              disabled={isReopening}
              className="px-4 py-2 bg-[rgb(70,160,35)] text-white rounded-lg hover:bg-[rgb(55,125,28)] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        message={`Are you sure you want to delete negotiation "${displayTitle}" (ID: ${n.negotiation_id})?`}
        isLoading={isDeleting}
      />
    </li>
  );
}

export default React.memo(NegotiationItem);
