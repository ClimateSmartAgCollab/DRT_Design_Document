"use client";

import React, { useState } from "react";
import {
  canMarkDelivered,
  canWithdrawAccess,
  FULFILLMENT_DISPLAY_NAMES,
  type FulfillmentStatus,
} from "../types";
import {
  markFulfillmentDelivered,
  markFulfillmentWithdrawn,
} from "../services/negotiationApi";

type FulfillmentAction = "deliver" | "withdraw";

const BADGE_CLASS: Record<FulfillmentStatus, string> = {
  not_applicable: "bg-gray-100 text-gray-700 border-gray-300",
  pending: "bg-yellow-50 text-yellow-800 border-yellow-300",
  delivered: "bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] border-[rgb(55,125,28)]",
  withdrawn: "bg-red-50 text-red-800 border-red-200",
};

interface FulfillmentActionsProps {
  negotiationId: string;
  state: string;
  fulfillmentStatus?: FulfillmentStatus | null;
  layout?: "row" | "stack";
  onUpdated?: () => void;
}

export function FulfillmentBadge({
  status,
}: {
  status?: FulfillmentStatus | null;
}) {
  if (!status) return null;
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${BADGE_CLASS[status]}`}
    >
      {FULFILLMENT_DISPLAY_NAMES[status]}
    </span>
  );
}

export function FulfillmentActions({
  negotiationId,
  state,
  fulfillmentStatus,
  layout = "row",
  onUpdated,
}: FulfillmentActionsProps) {
  const [action, setAction] = useState<FulfillmentAction | null>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDeliver = canMarkDelivered(state, fulfillmentStatus);
  const showWithdraw = canWithdrawAccess(state, fulfillmentStatus);

  if (state !== "accepted") return null;

  const closeModal = () => {
    if (isSaving) return;
    setAction(null);
    setNote("");
    setError(null);
  };

  const handleConfirm = async () => {
    if (!action) return;
    try {
      setIsSaving(true);
      setError(null);
      if (action === "deliver") {
        await markFulfillmentDelivered(negotiationId, note);
      } else {
        await markFulfillmentWithdrawn(negotiationId, note);
      }
      setAction(null);
      setNote("");
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className={
          layout === "stack"
            ? "flex flex-col gap-2 w-full"
            : "flex flex-wrap gap-2"
        }
      >
        {showDeliver && (
          <button
            type="button"
            onClick={() => setAction("deliver")}
            className={`${layout === "stack" ? "w-full " : ""}px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition`}
          >
            Mark delivered
          </button>
        )}
        {showWithdraw && (
          <button
            type="button"
            onClick={() => setAction("withdraw")}
            className={`${layout === "stack" ? "w-full " : ""}px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition`}
          >
            Withdraw access
          </button>
        )}
      </div>

      {action && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={closeModal}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {action === "deliver"
                    ? "Mark access delivered"
                    : "Withdraw access"}
                </h3>
                <p className="text-sm text-gray-600">
                  {action === "deliver"
                    ? "Record that the requestor has received the data. This is separate from the license email."
                    : "This records that this requestor no longer has access. It does not close the catalog door for new requests."}
                </p>
                {action === "withdraw" && (
                  <p className="text-sm text-red-700">
                    Withdraw cannot be undone except by reopening the case.
                  </p>
                )}
                <label className="block text-sm text-gray-700">
                  Note (optional)
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ticket, repo URL, or enclave account"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(70,160,35)]"
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                    action === "withdraw"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSaving
                    ? "Saving…"
                    : action === "withdraw"
                      ? "Withdraw access"
                      : "Mark delivered"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
