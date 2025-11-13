import React from "react";
import { OwnerCommentVersion } from "../types";

interface OverallCommentVersionsProps {
  ownerCommentVersions: OwnerCommentVersion[];
}

export function OverallCommentVersions({
  ownerCommentVersions,
}: OverallCommentVersionsProps) {
  if (!ownerCommentVersions || ownerCommentVersions.length === 0) {
    return null;
  }

  // Filter versions that have overall comments
  const relevantVersions = ownerCommentVersions
    .filter(version => version.comments && version.comments.trim());

  if (relevantVersions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <h4 className="font-semibold text-gray-700">Overall Comments History</h4>
      {relevantVersions.map((version, index) => {
        return (
          <div key={`overall-${version.timestamp}-${index}`} className="bg-gray-50 p-4 rounded border">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm text-gray-700">
                Overall Comments (Version {index + 1})
              </div>
              <div className="text-xs text-gray-500">
                {new Date(version.timestamp).toLocaleString()}
                {version.change_description && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {version.change_description}
                  </span>
                )}
              </div>
            </div>
            
            {/* Display overall comments */}
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {(() => {
                const comments = version.comments || '';
                const fieldCommentsIndex = comments.search(/\n*Field Comments:/);
                if (fieldCommentsIndex !== -1) {
                  return comments.substring(0, fieldCommentsIndex).trim();
                }
                return comments.trim();
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
