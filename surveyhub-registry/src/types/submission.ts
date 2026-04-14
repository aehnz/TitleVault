// Canonical Submission Schema - EXACT backend contract
// IMMUTABILITY RULES: Approved data is immutable. Rights are append-only events.

import { DocRef, DocumentsIndex } from './document';

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED';

export type ChangeKind = 'ADD_FLOOR' | 'GEOMETRY_CORRECTION' | 'DEACTIVATE_COMPONENT' | 'MERGE_COMPONENTS' | 'MISC';

export interface Anchor {
  id: string;
  wgs84: [number, number];
  local_xy: [number, number];
}

export interface RefFrame {
  type: 'local_planar';
  units: 'm';
}

export interface ActivePeriod {
  from: string; // YYYY-MM-DD
  to: string | null;
}

export interface Meta {
  submission_id: string;
  status: SubmissionStatus;
  created_by: string;
  schema_version: 'v1';
  created_at?: string;
  updated_at?: string;
  return_comment?: string;
  // Revision fields
  parent_submission_id?: string | null;
  change_kind?: ChangeKind;
  change_note?: string;
  revision_number?: number;  // 1 for original, 2+ for revisions
  locked?: boolean;          // true for APPROVED/SUBMITTED
  audit_trail?: {
    from: string | null;
    to: string;
    ts: string;
    note?: string;
  }[];
}

export interface Parcel {
  parcel_id: string;
  name: string;
  ref_frame: RefFrame;
  anchors: Anchor[];
  boundary_geom: string;
  docs: DocRef[];
}

export interface Building {
  building_id: string;
  parcel_id: string;
  name: string;
  footprint_geom: string;
  docs: DocRef[];
}

export interface Floor {
  floor_id: string;
  building_id: string;
  level: number;
  label: string;
  outline_geom: string;
  active: ActivePeriod;
  docs: DocRef[];
}

export interface Component {
  component_id: string;
  floor_id: string;
  label: string;
  type: 'shop' | 'office' | 'residential' | 'parking' | 'void' | 'utility' | 'food' | 'common' | 'stair' | 'lift';
  geom_ref: string;
  active: ActivePeriod;
  docs: DocRef[];
}

// DEPRECATED: Claims are now computed from rights_events
// Keeping for backwards compatibility
export interface ClaimTarget {
  kind: 'parcel' | 'building' | 'floor' | 'component';
  id: string;
}

export interface Claim {
  claim_id: string;
  kind: 'OWNERSHIP' | 'LEASE' | 'DISPUTE' | 'OCCUPANCY' | 'MORTGAGE' | 'EASEMENT';
  target: ClaimTarget;
  holder: string;
  tenant: string;
  share: number;
  area_geom: string | null;
  active: ActivePeriod;
  docs: DocRef[];
}

export interface TopologyEventTarget {
  kind?: 'parcel' | 'building' | 'floor' | 'component';
  entity?: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT' | 'COMMON_AREA';
  id: string;
}

export interface TopologyEventPayload {
  building_id?: string;
  floor_id?: string;
  component_id?: string;
  level?: number;
  label?: string;
  type?: string;
  outline_geom?: string;
  geom_ref?: string;
  prev_geom?: string;
  new_geom?: string;
  prev_outline_geom?: string;
  new_outline_geom?: string;
  reason?: string;
  effective_from?: string;
  [key: string]: unknown;
}

export interface TopologyEvent {
  event_id: string;
  kind: 'ADD_FLOOR' | 'UPDATE_FLOOR_GEOMETRY' | 'DEMOLISH_FLOOR' |
  'ADD_COMPONENT' | 'UPDATE_COMPONENT_GEOMETRY' | 'DEACTIVATE_COMPONENT' |
  'MERGE_COMPONENTS' | 'SPLIT_COMPONENT' |
  'ADD_COMMON_AREA' | 'GEOMETRY_CORRECTION';
  ts: string;
  target?: TopologyEventTarget;
  payload?: TopologyEventPayload;
  docs: DocRef[];
  note?: string;
  // Legacy fields (for backwards compatibility)
  floor_id?: string;
  component_id?: string;
  inputs?: string[];
  output?: string;
  output_geom?: string;
  from_geom?: string;
  to_geom?: string;
}

export interface Geometry {
  polygon: [number, number][];
}

export interface GeometryStore {
  [geom_id: string]: Geometry;
}

export interface Document {
  doc_id: string;
  type: string;
  title: string;
  hash?: string;
}

// The Canonical Submission Payload
export interface SubmissionPayload {
  meta: Meta;
  parcel: Parcel;
  buildings: Building[];
  floors: Floor[];
  components: Component[];
  claims: Claim[];                    // DEPRECATED - kept for backwards compatibility
  rights_events: RightsEvent[];       // NEW: Append-only rights event log
  claims_current?: ComputedClaims;    // NEW: Computed snapshot (read-only)
  topology_events: TopologyEvent[];
  geometry_store: GeometryStore;
  documents: Document[];
  documents_index?: DocumentsIndex;   // NEW: Central document metadata store
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  critical: string[];
  warnings: string[];
}
