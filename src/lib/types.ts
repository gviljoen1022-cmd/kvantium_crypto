export const STATUSES = [
  "Not Started",
  "Contacted",
  "Meeting Booked",
  "Requirement Confirmed",
  "Proposal Sent",
  "Landed",
  "Stalled",
] as const;
export type Status = (typeof STATUSES)[number];

export const SOURCES = ["New Prospect", "Carried Over", "Backfill"] as const;
export type Source = (typeof SOURCES)[number];

export const HORIZONS = ["60", "90-120"] as const;
export type Horizon = (typeof HORIZONS)[number];

export const ACTION_TYPES = ["call", "meeting", "email", "note"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ARTIFACT_TYPES = [
  "Readiness Review",
  "Proposal",
  "Meeting Notes",
  "Signed Agreement",
  "Other",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export function horizonLabel(h: Horizon): string {
  return h === "60" ? "60-Day" : "90-120 Day";
}

export type Region = {
  id: string;
  name: string;
  code: string;
  slug: string;
  created_at: string;
};

export type Target = {
  id: string;
  region_id: string;
  horizon: Horizon;
  customers: number;
  licenses: number;
  revenue_target: number;
  created_at: string;
};

export type Engagement = {
  id: string;
  region_id: string;
  target_id: string;
  customer_name: string;
  contact_name: string | null;
  designation: string | null;
  objective: string | null;
  horizon: Horizon;
  source: Source;
  status: Status;
  owner: string | null;
  license_count: number;
  next_action_date: string | null;
  backfill_of_id: string | null;
  locked_at: string | null;
  pipeline_deal_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Action = {
  id: string;
  engagement_id: string;
  type: ActionType;
  description: string;
  status_to: Status | null;
  next_action_date: string | null;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
};

export type Artifact = {
  id: string;
  engagement_id: string;
  file_name: string;
  file_path: string;
  artifact_type: ArtifactType;
  uploaded_by: string | null;
  uploaded_at: string;
};
