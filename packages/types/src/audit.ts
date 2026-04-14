/**
 * @udhbha/types — Audit Types
 * Extracted from property-auditor-hub/src/features/auditor/types.ts.
 * These are auditor-specific types for audit reports and reviews.
 */

import { SubmissionPayload, DetectedChangeKind } from './submission';

export type AuditDecision = 'PASS' | 'RETURNED' | 'FAIL';

export interface AuditReason {
  id: string;
  category: 'geometry' | 'rights' | 'documents' | 'topology' | 'consistency' | 'compliance';
  severity: 'critical' | 'major' | 'minor' | 'info';
  message: string;
  auto_detected: boolean;
  fix_hint?: string;
}

export interface CheckResult {
  passed: boolean;
  label: string;
  details?: string;
}

export interface AuditChecks {
  geometry_integrity: CheckResult;
  rights_consistency: CheckResult;
  document_completeness: CheckResult;
  topology_validity: CheckResult;
  schema_compliance: CheckResult;
  cross_reference: CheckResult;
}

export interface AuditSummary {
  total_checks: number;
  passed: number;
  failed: number;
  warnings: number;
}

export interface AuditNotes {
  auditor_comment?: string;
  internal_notes?: string;
}

export interface AuditIntegrity {
  submission_hash: string;
  audit_hash: string;
  verified_at: string;
}

export interface AuditReport {
  submission_id: string;
  audit_id: string;
  parent_submission_id?: string;
  auditor_id: string;
  audited_at: string;
  decision: AuditDecision;
  change_kind_detected: DetectedChangeKind;
  summary: AuditSummary;
  checks: AuditChecks;
  reasons: AuditReason[];
  notes?: AuditNotes;
  integrity?: AuditIntegrity;
  fix_hints?: Record<string, string>;
}

/** Auth response from the API */
export interface AuthResponse {
  token: string;
  user: {
    email: string;
    name: string;
    role?: string;
  };
}
