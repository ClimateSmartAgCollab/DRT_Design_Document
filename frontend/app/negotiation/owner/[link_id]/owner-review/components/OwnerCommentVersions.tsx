import React from "react";
import { OwnerCommentVersion } from "../types";
import { parseOwnerResponses } from "../utils/formUtils";

interface OwnerCommentVersionsProps {
  fieldId: string;
  ownerCommentVersions: OwnerCommentVersion[];
}

export function OwnerCommentVersions({
  fieldId,
  ownerCommentVersions,
}: OwnerCommentVersionsProps) {
  if (!ownerCommentVersions || ownerCommentVersions.length === 0) {
    return null;
  }

  const parseFieldCommentsFromGlobal = (comments: string) => {
    const fieldCommentsMatch = comments.match(/Field Comments:\n([\s\S]*)/);
    if (fieldCommentsMatch) {
      const fieldCommentsText = fieldCommentsMatch[1];
      const fieldComments: Record<string, string> = {};
      const lines = fieldCommentsText.split('\n');
      lines.forEach(line => {
        const match = line.match(/Field (\w+): (.+)/);
        if (match) {
          fieldComments[match[1]] = match[2];
        }
      });
      return fieldComments;
    }
    return {};
  };

  // Filter versions that have comments for this field
  const relevantVersions = ownerCommentVersions
    .map(version => {
      const fieldCommentsFromResponses = parseOwnerResponses(
        typeof version.owner_responses === 'string' 
          ? version.owner_responses 
          : version.owner_responses 
            ? JSON.stringify(version.owner_responses) 
            : null
      );
      
      const fieldCommentsFromGlobal = parseFieldCommentsFromGlobal(version.comments || '');
      
      const fieldComments = { ...fieldCommentsFromResponses, ...fieldCommentsFromGlobal };
      
      return {
        ...version,
        fieldComment: fieldComments[fieldId]
      };
    })
    .filter(version => version.fieldComment);

  if (relevantVersions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {relevantVersions.map((version, index) => (
        <div key={`${version.timestamp}-${index}`} className="bg-gray-50 p-3 rounded border">
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-sm text-gray-700">
              Owner Comments (Version {index + 1})
            </div>
            <div className="text-xs text-gray-500">
              {new Date(version.timestamp).toLocaleString()}
              {version.change_description && (
                <span className="ml-2 px-2 py-1 bg-[rgba(180,230,160,0.3)] text-[rgb(55,125,28)] rounded text-xs">
                  {version.change_description}
                </span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-800 mb-1">
            {version.fieldComment}
          </div>
        </div>
      ))}
    </div>
  );
}
