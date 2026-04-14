// ============================================
// AUDITOR PANEL TYPE DEFINITIONS
// Government-grade Property Registry Workflow
// ============================================

// ============ GEOMETRY TYPES ============
export interface Polygon {
  polygon: number[][];
}

export interface GeometryStore {
  [key: string]: Polygon;
}

// ============ DOCUMENT TYPES ============
export interface DocumentRef {
  id: string;
  name: string;
  type: 'survey' | 'plan' | 'sale_deed' | 'lease' | 'mortgage' | 'other';
}

export interface DocumentEntry extends DocumentRef {
  storage: {
    provider: 'LOCALHOST' | 'S3' | 'AZURE' | 'GCS';
    ref: string;
  };
}

export interface DocumentsIndex {
  [key: string]: DocumentEntry;
}

// Document review status set by auditor
export type DocReviewStatus = 'PENDING' | 'VALID' | 'MISSING' | 'ILLEGIBLE' | 'MISMATCH';

export interface DocumentReview {
  doc_id: string;
  status: DocReviewStatus;
  comment: string;
  reviewed_at: string;
}

// ============ REFERENCE FRAME ============
export interface RefFrame {
  type: 'local_planar' | 'wgs84';
  units: 'm' | 'ft';
}

export interface Anchor {
  id: string;
  wgs84: [number, number];
  local_xy: [number, number];
}

// ============ PARCEL ============
export interface Parcel {
  parcel_id: string;
  name?: string;
  ref_frame?: RefFrame;
  anchors?: Anchor[];
  boundary_geom: string;
  docs: DocumentRef[];
}

// ============ BUILDING ============
export interface Building {
  building_id: string;
  parcel_id?: string;
  name?: string;
  footprint_geom: string;
  docs: DocumentRef[];
}

// ============ FLOOR ============
export interface ActiveRange {
  from: string;
  to: string | null;
}

export interface Floor {
  floor_id: string;
  building_id: string;
  level: number;
  label: string;
  outline_geom: string;
  active: ActiveRange;
  docs: DocumentRef[];
}

// ============ COMPONENT (UNIT) ============
export type ComponentType = 'shop' | 'residential' | 'office' | 'parking' | 'common_area' | 'other';

export interface Component {
  component_id: string;
  floor_id: string;
  label: string;
  type: ComponentType;
  geom_ref: string;
  active: ActiveRange;
  docs: DocumentRef[];
}

// ============ EVENT TYPES ============
export type TopologyEventKind = 
  | 'ADD_FLOOR'
  | 'REMOVE_FLOOR'
  | 'ADD_COMPONENT'
  | 'REMOVE_COMPONENT'
  | 'SPLIT_COMPONENT'
  | 'MERGE_COMPONENTS'
  | 'UPDATE_GEOMETRY';

export type RightsEventKind =
  | 'ADD_OWNERSHIP'
  | 'TRANSFER_OWNERSHIP'
  | 'REMOVE_OWNERSHIP'
  | 'ADD_LEASE'
  | 'TERMINATE_LEASE'
  | 'ADD_MORTGAGE'
  | 'RELEASE_MORTGAGE';

export type DraftState = 'ACTIVE' | 'UNDONE';
export type EventOrigin = 'APPROVED_BASELINE' | 'DRAFT';

export interface TopologyEvent {
  event_id: string;
  kind: TopologyEventKind;
  ts: string;
  base_revision_id?: string;
  target: {
    entity: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT';
    id: string;
  };
  payload: Record<string, unknown>;
  docs: DocumentRef[];
  note?: string;
  created_at?: string;
  created_by?: string;
  draft_state?: DraftState;
  origin?: EventOrigin;
}

export interface RightsEvent {
  event_id: string;
  kind: RightsEventKind;
  ts: string;
  target: {
    level: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'UNIT';
    id: string;
  };
  payload: {
    holder?: string;
    previous_holder?: string;
    share?: number;
    [key: string]: unknown;
  };
  docs: DocumentRef[];
  note?: string;
  created_at?: string;
  created_by?: string;
  draft_state?: DraftState;
  origin?: EventOrigin;
}

// ============ SUBMISSION META ============
export type SubmissionStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'RETURNED'
  | 'AUDIT_PASSED'
  | 'AUDIT_FAILED';

export type ChangeKind = 
  | 'BASELINE'
  | 'TOPOLOGY_ONLY'
  | 'RIGHTS_ONLY'
  | 'TOPOLOGY_AND_RIGHTS'
  | 'DOCUMENT_UPDATE'
  | 'AUTO';

// Extended change kind for audit detection
export type DetectedChangeKind =
  | 'BASELINE'
  | 'TOPOLOGY_ONLY'
  | 'RIGHTS_ONLY'
  | 'TOPOLOGY_AND_RIGHTS'
  | 'DOCUMENT_UPDATE'
  | 'DOCS_ONLY'
  | 'MULTI_CHANGE'
  | 'AUTO';

export interface SubmissionMeta {
  submission_id: string;
  status: SubmissionStatus;
  created_by: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  parent_submission_id: string | null;
  change_kind: ChangeKind;
  change_note: string;
  revision_number: number;
  locked: boolean;
}

// ============ FULL SUBMISSION ============
export interface Submission {
  meta: SubmissionMeta;
  parcel: Parcel;
  buildings: Building[];
  floors: Floor[];
  components: Component[];
  rights_events: RightsEvent[];
  topology_events: TopologyEvent[];
  geometry_store: GeometryStore;
  documents_index: DocumentsIndex;
}

// ============ AUDIT TYPES ============
export type AuditDecision = 'PASS' | 'RETURNED' | 'FAIL';
export type CheckStatus = 'PASS' | 'FAIL' | 'WARN';
export type IssueSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

// Reason codes
export type GeometryReasonCode = 
  | 'GEOM_INVALID'
  | 'FLOOR_OUTSIDE_BUILDING'
  | 'COMPONENT_OUTSIDE_FLOOR'
  | 'OVERLAPPING_COMPONENTS';

export type RightsReasonCode =
  | 'MULTIPLE_ACTIVE_OWNERSHIP'
  | 'TRANSFER_PREV_HOLDER_MISMATCH'
  | 'INVALID_HOLDER_ID'
  | 'RIGHTS_TARGET_NOT_FOUND';

export type DocumentReasonCode =
  | 'MISSING_REQUIRED_DOC'
  | 'DOC_ILLEGIBLE'
  | 'DOC_MISMATCH';

export type WorkflowReasonCode =
  | 'CHANGE_KIND_MISMATCH';

export type ReasonCode = 
  | GeometryReasonCode 
  | RightsReasonCode 
  | DocumentReasonCode 
  | WorkflowReasonCode;

export interface AuditReason {
  code: ReasonCode;
  severity: IssueSeverity;
  entity: {
    level: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT' | 'EVENT' | 'DOC';
    id: string;
  };
  message: string;
}

export interface CheckResult {
  check_id: string;
  name: string;
  status: CheckStatus;
  message: string;
  entity_id?: string;
  entity_type?: string;
}

export interface GeometryCheckResults {
  status: CheckStatus;
  results: CheckResult[];
}

export interface RightsCheckResults {
  status: CheckStatus;
  results: CheckResult[];
}

export interface DocumentCheckResult {
  doc_id: string;
  doc_name: string;
  required: boolean;
  status: DocReviewStatus;
  comment: string;
}

export interface DocumentCheckResults {
  status: CheckStatus;
  doc_results: DocumentCheckResult[];
}

export interface AuditSummary {
  topology_events: number;
  rights_events: number;
  docs_total: number;
  docs_required: number;
  docs_missing: number;
  checks_failed: number;
}

export interface AuditChecks {
  geometry: GeometryCheckResults;
  rights: RightsCheckResults;
  documents: DocumentCheckResults;
}

export interface AuditNotes {
  public: string;
  internal: string;
}

export interface AuditIntegrity {
  audit_hash_preview: string;
  inputs_hash_preview: string;
}

// Fix hint for surveyor
export interface FixHintEntity {
  level: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT' | 'EVENT' | 'DOC';
  id: string;
  reason: ReasonCode;
}

export interface FixHints {
  entities: FixHintEntity[];
}

export interface AuditReport {
  audit_id: string;
  submission_id: string;
  parent_submission_id: string | null;
  auditor_id: string;
  audited_at: string;
  decision: AuditDecision;
  change_kind_detected: DetectedChangeKind;
  summary: AuditSummary;
  checks: AuditChecks;
  reasons: AuditReason[];
  notes: AuditNotes;
  integrity: AuditIntegrity;
  fix_hints: FixHints;
}

// ============ AUDIT STATE ============
export interface AuditState {
  submission_id: string;
  decision: AuditDecision | null;
  reasons: AuditReason[];
  notes: AuditNotes;
  document_reviews: DocumentReview[];
  geometry_check_results: GeometryCheckResults | null;
  rights_check_results: RightsCheckResults | null;
  document_check_results: DocumentCheckResults | null;
  override_enabled: boolean;
  // Check run flags
  geometryChecksRun: boolean;
  rightsChecksRun: boolean;
  docChecksRun: boolean;
}

// Required document info
export interface RequiredDocInfo {
  doc_id: string;
  doc_type: string;
  reason: string;
  event_id: string;
  entity_type: string;
  found: boolean;
}

// ============ DIFF TYPES ============
export type DiffAction = 'ADDED' | 'REMOVED' | 'MODIFIED';

export interface DiffItem {
  action: DiffAction;
  entity_type: 'FLOOR' | 'COMPONENT' | 'GEOMETRY' | 'OWNERSHIP';
  entity_id: string;
  label: string;
  event_id?: string;
  details?: string;
}

export interface SubmissionDiff {
  topology: DiffItem[];
  rights: DiffItem[];
  geometry: DiffItem[];
}

// ============ OWNERSHIP CLAIM ============
export interface OwnershipClaim {
  target_id: string;
  target_level: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'UNIT';
  holder: string;
  share: number;
  active: boolean;
  from_event_id: string;
  ended_by_event_id?: string;
  from_ts: string;
  to_ts?: string;
}

// ============ INBOX ITEM ============
export interface InboxItem {
  submission_id: string;
  parcel_id: string;
  parcel_name?: string;
  status: SubmissionStatus;
  change_kind: ChangeKind;
  submitted_by: string;
  submitted_at: string;
  revision_number: number;
  event_counts: {
    topology: number;
    rights: number;
  };
}
