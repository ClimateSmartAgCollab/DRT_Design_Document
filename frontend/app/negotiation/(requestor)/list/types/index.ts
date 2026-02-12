// drt_frontend\app\negotiation\(requestor)\list\types\index.ts

export interface Negotiation {
  negotiation_id: string;
  state: string;
  conversation_id: string;
  requestor_responses: Record<string, any>;
  owner_responses: string[];
  comments: string[];
  timestamps: string;
  archived: boolean;
  requestor_link: string | null;
  rationale?: string | null;
  visible_label?: string;
  record_label?: string;
  requestor_email?: string | null;
  questionnaire?: any;
}

export const ALL_STATUSES = [
  "requestor_open",
  "owner_open",
  "accepted",
  "rejected",
  "abandoned",
] as const;
export type Status = (typeof ALL_STATUSES)[number];

export const STATUS_DISPLAY_NAMES: Record<Status, string> = {
  requestor_open: "Requester Open",
  owner_open: "Owner Open",
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
