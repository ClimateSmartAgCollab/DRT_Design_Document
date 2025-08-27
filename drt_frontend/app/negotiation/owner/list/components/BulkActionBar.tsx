// drt_frontend\app\negotiation\owner\list\components\BulkActionBar.tsx
import React from "react";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface BulkActionBarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  isDeleting?: boolean;
}

export function BulkActionBar({ selectedCount, onDeleteSelected, isDeleting = false }: BulkActionBarProps) {
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    onDeleteSelected();
    setShowDeleteModal(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleDeleteClick}
          disabled={selectedCount === 0 || isDeleting}
          className={`px-4 py-2 rounded ${
            selectedCount && !isDeleting
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isDeleting ? "Deleting..." : `Delete Selected (${selectedCount})`}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Selected Negotiations"
        message={`Are you sure you want to delete ${selectedCount} selected negotiation${selectedCount !== 1 ? 's' : ''}?`}
        itemCount={selectedCount}
        isLoading={isDeleting}
      />
    </>
  );
}