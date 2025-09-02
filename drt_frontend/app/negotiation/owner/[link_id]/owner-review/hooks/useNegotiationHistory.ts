import { useMemo } from "react";
import { NegotiationHistory, HistoryEntry } from "../types";

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
        if (
          currentEntry &&
          (currentEntry.owner_responses || currentEntry.comments)
        ) {
          entries.push({
            data: {
              questionnaire: history.questionnaire,
              requestor_responses: currentEntry.requestor_responses || {},
              owner_responses: currentEntry.owner_responses
                ? JSON.stringify(currentEntry.owner_responses)
                : null,
              comments: currentEntry.comments || "",
              state: currentEntry.state,
              rationale: history.rationale,
            },
            timestamp: currentEntry.timestamp,
            changeDescription: currentEntry.change_description,
          });
        }

        currentEntry = {
          requestor_responses: archiveEntry.requestor_responses,
          owner_responses: null,
          comments: "",
          state: archiveEntry.state,
          timestamp: archiveEntry.timestamp,
          change_description: archiveEntry.change_description,
        };
      }

      if (hasOwnerData) {
        if (currentEntry) {
          currentEntry.owner_responses = archiveEntry.owner_responses;
          currentEntry.comments = archiveEntry.comments;
          currentEntry.state = archiveEntry.state;
          currentEntry.timestamp = archiveEntry.timestamp;
          currentEntry.change_description = archiveEntry.change_description;
        } else {
          currentEntry = {
            requestor_responses: {},
            owner_responses: archiveEntry.owner_responses,
            comments: archiveEntry.comments,
            state: archiveEntry.state,
            timestamp: archiveEntry.timestamp,
            change_description: archiveEntry.change_description,
          };
        }
      }
    });

    if (currentEntry) {
      entries.push({
        data: {
          questionnaire: history.questionnaire,
          requestor_responses: currentEntry.requestor_responses || {},
          owner_responses: currentEntry.owner_responses
            ? JSON.stringify(currentEntry.owner_responses)
            : null,
          comments: currentEntry.comments || "",
          state: currentEntry.state,
          rationale: history.rationale,
        },
        timestamp: currentEntry.timestamp,
        changeDescription: currentEntry.change_description,
      });
    }

    return entries;
  }, [history]);

  return { historyEntries };
}
