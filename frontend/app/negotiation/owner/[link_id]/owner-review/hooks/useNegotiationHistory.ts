import { useMemo } from "react";
import {
  NegotiationHistory,
  HistoryEntry,
  OwnerCommentVersion,
} from "../types";

export function useNegotiationHistory(history: NegotiationHistory | undefined) {
  const historyEntries = useMemo((): HistoryEntry[] => {
    if (!history?.archive_history || history.archive_history.length === 0) {
      return [];
    }

    const entries: HistoryEntry[] = [];

    let currentEntry: any = null;

    history.archive_history.forEach((archiveEntry) => {
      const hasRequestorData =
        archiveEntry.requestor_responses &&
        Object.keys(archiveEntry.requestor_responses).length > 0;
      const hasOwnerData =
        archiveEntry.owner_responses || archiveEntry.comments;

      if (hasRequestorData) {
        if (currentEntry) {
          entries.push({
            data: {
              questionnaire: history.questionnaire,
              requestor_responses: currentEntry.requestor_responses || {},
              owner_responses:
                currentEntry.ownerCommentVersions &&
                currentEntry.ownerCommentVersions.length > 0
                  ? currentEntry.ownerCommentVersions[
                      currentEntry.ownerCommentVersions.length - 1
                    ].owner_responses
                    ? JSON.stringify(
                        currentEntry.ownerCommentVersions[
                          currentEntry.ownerCommentVersions.length - 1
                        ].owner_responses
                      )
                    : null
                  : null,
              comments:
                currentEntry.ownerCommentVersions &&
                currentEntry.ownerCommentVersions.length > 0
                  ? currentEntry.ownerCommentVersions[
                      currentEntry.ownerCommentVersions.length - 1
                    ].comments || ""
                  : "",
              state:
                currentEntry.ownerCommentVersions &&
                currentEntry.ownerCommentVersions.length > 0
                  ? currentEntry.ownerCommentVersions[
                      currentEntry.ownerCommentVersions.length - 1
                    ].state
                  : currentEntry.state,
              rationale: history.rationale,
            },
            timestamp: currentEntry.timestamp,
            changeDescription: currentEntry.change_description,
            ownerCommentVersions: currentEntry.ownerCommentVersions || [],
          });
        }

        currentEntry = {
          requestor_responses: archiveEntry.requestor_responses,
          ownerCommentVersions: [],
          state: archiveEntry.state,
          timestamp: archiveEntry.timestamp,
          change_description: archiveEntry.change_description,
        };
      }

      if (hasOwnerData && currentEntry) {
        const ownerVersion: OwnerCommentVersion = {
          timestamp: archiveEntry.timestamp,
          owner_responses: archiveEntry.owner_responses,
          comments: archiveEntry.comments,
          state: archiveEntry.state,
          change_description: archiveEntry.change_description,
        };

        currentEntry.ownerCommentVersions.push(ownerVersion);
      }
    });

    if (currentEntry) {
      entries.push({
        data: {
          questionnaire: history.questionnaire,
          requestor_responses: currentEntry.requestor_responses || {},
          owner_responses:
            currentEntry.ownerCommentVersions &&
            currentEntry.ownerCommentVersions.length > 0
              ? currentEntry.ownerCommentVersions[
                  currentEntry.ownerCommentVersions.length - 1
                ].owner_responses
                ? JSON.stringify(
                    currentEntry.ownerCommentVersions[
                      currentEntry.ownerCommentVersions.length - 1
                    ].owner_responses
                  )
                : null
              : null,
          comments:
            currentEntry.ownerCommentVersions &&
            currentEntry.ownerCommentVersions.length > 0
              ? currentEntry.ownerCommentVersions[
                  currentEntry.ownerCommentVersions.length - 1
                ].comments || ""
              : "",
          state:
            currentEntry.ownerCommentVersions &&
            currentEntry.ownerCommentVersions.length > 0
              ? currentEntry.ownerCommentVersions[
                  currentEntry.ownerCommentVersions.length - 1
                ].state
              : currentEntry.state,
          rationale: history.rationale,
        },
        timestamp: currentEntry.timestamp,
        changeDescription: currentEntry.change_description,
        ownerCommentVersions: currentEntry.ownerCommentVersions || [],
      });
    }

    return entries;
  }, [history]);

  return { historyEntries };
}
