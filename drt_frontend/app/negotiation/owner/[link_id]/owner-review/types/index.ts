export type NegotiationData = {
  questionnaire: any; // The questionnaire JSON data
  owner_responses: string | null;
  comments: string | null;
  requestor_responses: { [key: string]: any };
  state: string;
  rationale?: string;
};

export type ArchiveEntry = {
  entry_number: number;
  timestamp: string;
  changed_by: string;
  change_description: string;
  state: string;
  requestor_responses: Record<string, any> | null;
  owner_responses: Record<string, any> | null;
  comments: string | null;
};

export type NegotiationHistory = {
  negotiation_id: string;
  conversation_id: string;
  state: string;
  timestamps: string;
  requestor_responses: Record<string, any> | null;
  owner_responses: Record<string, any> | null;
  comments: string | null;
  rationale?: string;
  questionnaire?: any;
  version_history?: ArchiveEntry[];
  archive_history?: ArchiveEntry[];
  is_legacy: boolean;
};

export type HistoryEntry = {
  data: any;
  timestamp: string;
  changeDescription?: string;
};
