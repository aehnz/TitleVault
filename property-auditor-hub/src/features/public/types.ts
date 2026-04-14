import { AuditReport, Building, ChainAnchor, Component, DocumentsIndex, Floor, GeometryStore, OwnershipClaim, Parcel, RegistrarRecord, RightsEvent, Submission, TopologyEvent, TransparencyBundle } from '@udhbha/types';

// ============================================
// PUBLIC TRANSPARENCY TYPE DEFINITIONS
// Read-only verification interface types
// ============================================

// ============ SEARCH MODES ============
export type SearchMode = 'VERIFY_RECORD' | 'FIND_HOLDINGS' | 'CHECK_UNIT';

// ============ INPUT DETECTION ============
export type DetectedInputType = 
  | 'PARCEL_ID'
  | 'SUBMISSION_ID'
  | 'TX_HASH'
  | 'BUNDLE_HASH'
  | 'OWNER_ID'
  | 'COMPONENT_ID'
  | 'FLOOR_ID'
  | 'AADHAAR_LIKE'
  | 'UNKNOWN';

export interface ParsedSearchInput {
  raw: string;
  sanitized: string;
  type: DetectedInputType;
  isMasked: boolean;
  warning?: string;
}

// ============ PUBLIC RECORD DATA ============
export interface PublicRecordData {
  submission: Submission;
  parent: Submission | null;
  auditReport: AuditReport | null;
  registrarRecord: RegistrarRecord | null;
  transparencyBundle: TransparencyBundle | null;
  chainAnchor: ChainAnchor | null;
}

// ============ REVISION SNAPSHOT ============
export interface RevisionSnapshot {
  revisionNumber: number;
  timestamp: string;
  parcel: Parcel;
  buildings: Building[];
  floors: Floor[];
  components: Component[];
  geometryStore: GeometryStore;
  topologyEvents: TopologyEvent[];
  rightsEvents: RightsEvent[];
  claims: OwnershipClaim[];
}

// ============ OWNERSHIP SEARCH RESULTS ============
export interface HoldingResult {
  parcelId: string;
  parcelName: string;
  submissionId: string;
  componentId: string;
  componentLabel: string;
  componentType: string;
  floorId: string;
  floorLabel: string;
  share: number;
  link: string;
}

export interface UnitOwnershipResult {
  componentId: string;
  componentLabel: string;
  componentType: string;
  floorId: string;
  floorLabel: string;
  parcelId: string;
  parcelName: string;
  currentOwners: {
    holder: string;
    maskedHolder: string;
    share: number;
    fromTs: string;
    fromEventId: string;
  }[];
  lastTransferEvent: RightsEvent | null;
  chainAnchor: ChainAnchor | null;
  isOwner?: boolean; // Set when owner_id is provided for verification
}

// ============ SEARCH STATE ============
export interface PublicSearchState {
  mode: SearchMode;
  input: string;
  secondaryInput?: string; // For owner_id in CHECK_UNIT mode
  parsedInput: ParsedSearchInput | null;
  isLoading: boolean;
  error: string | null;
  recordData: PublicRecordData | null;
  holdingsResults: HoldingResult[] | null;
  unitResult: UnitOwnershipResult | null;
}

// ============ TIMELINE ITEM ============
export type TimelineItemType = 
  | 'REVISION_HEADER'
  | 'TOPOLOGY_EVENT'
  | 'RIGHTS_EVENT'
  | 'AUDIT_DECISION'
  | 'REGISTRAR_DECISION';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  revisionNumber: number;
  timestamp: string;
  title: string;
  subtitle?: string;
  actorType: 'SURVEYOR' | 'AUDITOR' | 'REGISTRAR';
  entityId?: string;
  entityType?: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT';
  eventKind?: string;
  status?: 'PASS' | 'FAIL' | 'RETURNED' | 'APPROVED_FINAL' | 'REJECTED_FINAL';
  isOwnerRelevant?: boolean; // true if this event involves the searched owner
}

// ============ VERIFICATION RESULT ============
export interface VerificationResult {
  isVerified: boolean;
  computedHashes: {
    bundleHash: string;
    submissionHash: string;
    auditHash: string;
    parentHash: string;
  };
  storedHashes: {
    bundleHash: string;
    submissionHash: string;
    auditHash: string;
    parentHash: string;
  };
  mismatches: string[];
}

// ============ EXPORT BUNDLE ============
export interface PublicExportBundle {
  parcel_id: string;
  parcel_name: string;
  revision: number;
  status: string;
  change_summary: {
    topology: string[];
    rights: string[];
  };
  audit: {
    decision: string;
    public_notes: string;
    audited_at: string;
  };
  registrar: {
    decision: string;
    public_notes: string;
    decided_at: string;
  };
  proof: {
    bundle_hash: string;
    submission_hash: string;
    audit_hash: string;
    parent_hash: string;
    tx_hash: string;
    network: string;
  };
  exported_at: string;
}
