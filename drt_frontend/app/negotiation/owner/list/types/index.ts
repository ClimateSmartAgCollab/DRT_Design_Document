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
}

export const ALL_STATUSES = [
  "requestor_open",
  "completed",
  "canceled",
  "rejected",
  "owner_open",
] as const;
export type Status = typeof ALL_STATUSES[number];

export type ArchivedFilter = "all" | "archived" | "active";

export type SortOption =
  | "created_asc"
  | "created_desc"
  | "status_asc"
  | "status_desc"
  | "archived_first"
  | "archived_last";

