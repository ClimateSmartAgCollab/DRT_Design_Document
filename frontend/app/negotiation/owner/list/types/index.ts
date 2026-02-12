// drt_frontend\app\negotiation\owner\list\types\index.ts

export interface Negotiation {
  negotiation_id: string;
  state: string;
  conversation_id: string;
  requestor_responses: Record<string, any>;
  owner_responses: string[];
  comments: string[];
  timestamps: string;
  archived: boolean;
  owner_link: string | null;
  rationale?: string | null;
  tags?: string[];
  record_label?: string;
  visible_label?: string;
  requestor_email?: string | null;
  questionnaire?: any;
}

export const ALL_STATUSES = [
  "owner_open",
  "requestor_open", 
  "accepted",
  "rejected",
  "abandoned",
] as const;
export type Status = typeof ALL_STATUSES[number];

export const STATUS_DISPLAY_NAMES: Record<Status, string> = {
  owner_open: "Owner Open",
  requestor_open: "Requester Open",
  accepted: "Accepted",
  rejected: "Rejected",
  abandoned: "Abandoned",
};

export type ArchivedFilter = "all" | "archived" | "active";

export type SortOption =
  | "created_asc"
  | "created_desc"
  | "status_asc"
  | "status_desc";

