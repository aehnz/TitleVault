import { AuditReport, Submission, SubmissionStatus } from '@udhbha/types';

// ============================================
// REGISTRAR PANEL TYPE DEFINITIONS
// Final approval and blockchain anchoring workflow
// ============================================

// ============ REGISTRAR SESSION ============
export interface RegistrarSession {
  role: 'REGISTRAR';
  email: string;
  login_at: string;
}

// ============ REGISTRAR DECISION ============
export type RegistrarDecision = 'APPROVED_FINAL' | 'REJECTED_FINAL' | 'RETURNED';

// ============ REGISTRAR REASON CODES ============
export type RegistrarReasonCode =
  | 'LEGAL_COMPLIANCE_ISSUE'
  | 'AUDIT_OVERRIDE_NOT_ACCEPTED'
  | 'DOCUMENT_POLICY_VIOLATION'
  | 'JURISDICTION_MISMATCH'
  | 'FRAUD_SUSPECTED'
  | 'OTHER';

export interface RegistrarReason {
  code: RegistrarReasonCode;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  entity_ref?: {
    level: 'PARCEL' | 'BUILDING' | 'FLOOR' | 'COMPONENT' | 'EVENT' | 'DOC';
    id: string;
  };
}

// ============ CHAIN ANCHOR ============
export interface ChainAnchor {
  network: 'DEMO' | 'POLYGON' | 'ETHEREUM' | 'STARKNET';
  tx_hash: string;
  anchored_at: string;
  bundle_hash: string;
  submission_hash: string;
  audit_hash: string;
  parent_hash: string;
}

// ============ REGISTRAR NOTES ============
export interface RegistrarNotes {
  public: string;
  internal: string;
}

// ============ REGISTRAR RECORD ============
export interface RegistrarRecord {
  record_id: string;
  submission_id: string;
  parent_submission_id: string | null;
  registrar_id: string;
  decided_at: string;
  decision: RegistrarDecision;
  reasons: RegistrarReason[];
  notes: RegistrarNotes;
  chain_anchor: ChainAnchor | null;
}

// ============ TRANSPARENCY BUNDLE ============
export interface TransparencyBundle {
  transparency_bundle: {
    public_id: string;
    parcel_id: string;
    submission_id: string;
    revision_number: number;
    change_summary: {
      topology: string[];
      rights: string[];
    };
    audit: {
      decision: string;
      public_notes: string;
      public_reasons: string[];
    };
    registrar: {
      decision: string;
      public_notes: string;
    };
    proof: {
      bundle_hash: string;
      submission_hash: string;
      audit_hash: string;
      parent_hash: string;
      tx_hash: string;
    };
    redactions: {
      mask_holders: boolean;
      mask_doc_storage_refs: boolean;
    };
  };
}

// ============ REGISTRAR SETTINGS ============
export interface RegistrarSettings {
  allowApproveWithoutAnchor: boolean;
  demoChainEnabled: boolean;
  strictApproveOnlyAuditPass: boolean;
  showMaskingOptions: boolean;
}

// ============ REGISTRAR INBOX ITEM ============
export interface RegistrarInboxItem {
  submission_id: string;
  parent_submission_id: string | null;
  parcel_id: string;
  parcel_name?: string;
  revision_number: number;
  change_kind: string;
  audited_at: string;
  auditor_id: string;
  audit_summary: 'PASS' | 'WARN';
  has_anchor: boolean;
}

// ============ COMPUTED HASHES ============
export interface ComputedHashes {
  parent_hash: string;
  submission_hash: string;
  audit_hash: string;
  bundle_hash: string;
}

// ============ REGISTRAR STATE ============
export interface RegistrarState {
  submission_id: string;
  decision: RegistrarDecision | null;
  reasons: RegistrarReason[];
  notes: RegistrarNotes;
  hashes: ComputedHashes | null;
  chain_anchor: ChainAnchor | null;
  transparency_bundle: TransparencyBundle | null;
}
