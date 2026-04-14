/**
 * @udhbha/types — Submission Types
 * Single source of truth for submission payloads.
 * Merged from surveyor (SubmissionPayload) + auditor (Submission).
 * Resolution: Use surveyor's type names (more complete) + auditor's extended statuses.
 */

import { RightsEvent, ComputedClaims } from './rights';
import { DocRef, DocumentsIndex } from './document';

// Merged status: surveyor's 4 + auditor's 2 additional
export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'RETURNED'
  | 'APPROVED'
  | 'AUDIT_PASSED'
  | 'AUDIT_FAILED';

// Surveyor mutation kinds (what change the surveyor intends)
export type MutationKind =
  | 'ADD_FLOOR'
  | 'GEOMETRY_CORRECTION'
  | 'DEACTIVATE_COMPONENT'
  | 'MERGE_COMPONENTS'
  | 'MISC';

// Auditor detection kinds (what the auditor classifies it as)
export type DetectedChangeKind =
  | 'BASELINE'
  | 'TOPOLOGY_ONLY'
  | 'RIGHTS_ONLY'
  | 'TOPOLOGY_AND_RIGHTS'
  | 'DOCUMENT_UPDATE'
  | 'AUTO';

// Union of both for the ChangeKind field
export type ChangeKind = MutationKind | DetectedChangeKind;

export interface Anchor {
  id: string;
  wgs84: [number, number];
  local_xy: [number, number];
}

export interface RefFrame {
  type: 'local_planar' | 'wgs84';
  units: 'm' | 'ft';
}

export interface ActivePeriod {
  from: string;
  to: string | null;
}

export interface AuditTrailEntry {
  from: string | null;
  to: string;
  ts: string;
  note?: string;
  actor?: string;
}

export interface Meta {
  submission_id: string;
  status: SubmissionStatus;
  created_by: string;
  schema_version: 'v1';
  created_at?: string;
  updated_at?: string;
  return_comment?: string;
  parent_submission_id?: string | null;
  change_kind?: ChangeKind;
  change_note?: string;
  revision_number?: number;
  locked?: boolean;
  audit_trail?: AuditTrailEntry[];
}

export interface Parcel {
  parcel_id: string;
  name: string;
  ref_frame?: RefFrame;
  anchors?: Anchor[];
  boundary_geom?: string;
  docs?: DocRef[];
}

export interface Building {
  building_id: string;
  parcel_id?: string;
  name?: string;
  footprint_geom?: string;
  docs?: DocRef[];
}

export interface Floor {
  floor_id: string;
  building_id: string;
  level: number;
  label: string;
  outline_geom: string;
  active: ActivePeriod;
  docs?: DocRef[];
}

// Merged component types: surveyor's 10 + auditor's extras
export type ComponentType =
  | 'shop' | 'office' | 'residential' | 'parking'
  | 'void' | 'utility' | 'food' | 'common' | 'stair' | 'lift'
  | 'common_area' | 'other';

export interface Component {
  component_id: string;
  floor_id: string;
  label: string;
  type: ComponentType;
  geom_ref: string;
  active: ActivePeriod;
  docs?: DocRef[];
}

// Legacy claim types (deprecated — use rights_events/claims_current)
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

// Topology events
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

/** The Canonical Submission Payload */
export interface SubmissionPayload {
  meta: Meta;
  parcel: Parcel;
  buildings: Building[];
  floors: Floor[];
  components: Component[];
  claims?: Claim[];
  rights_events: RightsEvent[];
  claims_current?: ComputedClaims;
  topology_events?: TopologyEvent[];
  geometry_store: GeometryStore;
  documents: Document[];
  documents_index?: DocumentsIndex;
}

export interface ValidationResult {
  valid: boolean;
  critical: string[];
  warnings: string[];
}

/** Paginated response from the API */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
