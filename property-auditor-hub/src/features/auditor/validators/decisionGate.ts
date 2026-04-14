import { AuditReason, CheckStatus, DocReviewStatus } from '@udhbha/types';

// ============================================
// DECISION GATE - Single source of truth for audit decision logic
// ============================================

export type DecisionType = 'PASS' | 'RETURNED' | 'FAIL';

export interface DecisionGateInputs {
  // Check run flags
  geometryChecksRun: boolean;
  rightsChecksRun: boolean;
  docChecksRun: boolean;
  
  // Settings
  requireChecksBeforeDecision: boolean;
  strictMode: boolean;
  
  // Check statuses (null means not run)
  geometryStatus: CheckStatus | null;
  rightsStatus: CheckStatus | null;
  docsStatus: CheckStatus | null;
  
  // Required documents with their review status
  requiredDocs: { doc_id: string; status: DocReviewStatus }[];
  
  // Audit state
  selectedReasons: AuditReason[];
  publicNote: string;
  internalNote: string;
  overrideEnabled: boolean;
}

export interface DecisionGateOutputs {
  // Whether the decision button can be clicked to open the decision flow
  canOpenPass: boolean;
  canOpenReturn: boolean;
  canOpenFail: boolean;
  
  // Blockers explaining why the button is disabled
  passBlockers: string[];
  returnBlockers: string[];
  failBlockers: string[];
  
  // Whether the submit button inside modal is enabled
  canSubmitPass: boolean;
  canSubmitReturn: boolean;
  canSubmitFail: boolean;
  
  // Submit blockers
  passSubmitBlockers: string[];
  returnSubmitBlockers: string[];
  failSubmitBlockers: string[];
  
  // Debug info
  debug: {
    checksComplete: boolean;
    hardFail: boolean;
    warnings: boolean;
    requiredDocFailures: number;
    requiredDocPending: number;
  };
}

/**
 * Centralized decision gating logic
 * Returns what buttons are enabled and why others are blocked
 */
export function computeDecisionGate(inputs: DecisionGateInputs): DecisionGateOutputs {
  const {
    geometryChecksRun,
    rightsChecksRun,
    docChecksRun,
    requireChecksBeforeDecision,
    strictMode,
    geometryStatus,
    rightsStatus,
    docsStatus,
    requiredDocs,
    selectedReasons,
    publicNote,
    internalNote,
    overrideEnabled,
  } = inputs;

  // A) Checks completeness
  const checksComplete = !requireChecksBeforeDecision || 
    (geometryChecksRun && rightsChecksRun && docChecksRun);

  // B) Hard failures
  // Required doc is MISSING | ILLEGIBLE | MISMATCH always fail
  // In strictMode: PENDING also counts as fail
  const requiredDocFailures = requiredDocs.filter(d =>
    d.status === 'MISSING' || 
    d.status === 'ILLEGIBLE' || 
    d.status === 'MISMATCH' ||
    (strictMode && d.status === 'PENDING')
  );

  const requiredDocPending = requiredDocs.filter(d => d.status === 'PENDING');

  const hardFail = 
    geometryStatus === 'FAIL' || 
    rightsStatus === 'FAIL' || 
    requiredDocFailures.length > 0;

  // C) Soft warnings
  const warnings = 
    geometryStatus === 'WARN' ||
    rightsStatus === 'WARN' ||
    (!strictMode && requiredDocPending.length > 0);

  // === PASS ===
  const passBlockers: string[] = [];
  const passSubmitBlockers: string[] = [];

  if (!checksComplete) {
    passBlockers.push('Run all checks first');
  }
  if (hardFail && !overrideEnabled) {
    passBlockers.push('Hard failures exist: fix or use override');
  }
  // Pending required docs ALWAYS block PASS (auditor must review all required docs)
  if (requiredDocPending.length > 0 && !overrideEnabled) {
    passBlockers.push(`${requiredDocPending.length} required document(s) still pending review`);
  }
  if (hardFail && overrideEnabled && !internalNote.trim()) {
    passSubmitBlockers.push('Override requires internal note');
  }

  const canOpenPass = checksComplete && (!hardFail || overrideEnabled) && (requiredDocPending.length === 0 || overrideEnabled);
  const canSubmitPass = canOpenPass && 
    (overrideEnabled ? internalNote.trim().length > 0 : true);

  // === RETURN ===
  const returnBlockers: string[] = [];
  const returnSubmitBlockers: string[] = [];

  if (!checksComplete) {
    returnBlockers.push('Run all checks first');
  }
  
  // Submit requirements for RETURN
  if (selectedReasons.length === 0) {
    returnSubmitBlockers.push('Add at least one reason');
  }
  if (!publicNote.trim()) {
    returnSubmitBlockers.push('Public note required');
  }

  const canOpenReturn = checksComplete;
  const canSubmitReturn = checksComplete && 
    selectedReasons.length >= 1 && 
    publicNote.trim().length > 0;

  // === FAIL ===
  const failBlockers: string[] = [];
  const failSubmitBlockers: string[] = [];

  if (!checksComplete) {
    failBlockers.push('Run all checks first');
  }

  // Submit requirements for FAIL
  if (selectedReasons.length === 0) {
    failSubmitBlockers.push('Add at least one reason');
  }
  if (!internalNote.trim()) {
    failSubmitBlockers.push('Internal note required');
  }

  const canOpenFail = checksComplete;
  const canSubmitFail = checksComplete && 
    selectedReasons.length >= 1 && 
    internalNote.trim().length > 0;

  return {
    canOpenPass,
    canOpenReturn,
    canOpenFail,
    passBlockers,
    returnBlockers,
    failBlockers,
    canSubmitPass,
    canSubmitReturn,
    canSubmitFail,
    passSubmitBlockers,
    returnSubmitBlockers,
    failSubmitBlockers,
    debug: {
      checksComplete,
      hardFail,
      warnings,
      requiredDocFailures: requiredDocFailures.length,
      requiredDocPending: requiredDocPending.length,
    },
  };
}

/**
 * Helper to get the appropriate blockers for a decision type
 */
export function getBlockersForDecision(
  gate: DecisionGateOutputs,
  decision: DecisionType,
  isSubmit: boolean
): string[] {
  if (isSubmit) {
    switch (decision) {
      case 'PASS': return gate.passSubmitBlockers;
      case 'RETURNED': return gate.returnSubmitBlockers;
      case 'FAIL': return gate.failSubmitBlockers;
    }
  } else {
    switch (decision) {
      case 'PASS': return gate.passBlockers;
      case 'RETURNED': return gate.returnBlockers;
      case 'FAIL': return gate.failBlockers;
    }
  }
}

/**
 * Get whether a decision can be opened
 */
export function canOpenDecision(gate: DecisionGateOutputs, decision: DecisionType): boolean {
  switch (decision) {
    case 'PASS': return gate.canOpenPass;
    case 'RETURNED': return gate.canOpenReturn;
    case 'FAIL': return gate.canOpenFail;
  }
}

/**
 * Get whether a decision can be submitted
 */
export function canSubmitDecision(gate: DecisionGateOutputs, decision: DecisionType): boolean {
  switch (decision) {
    case 'PASS': return gate.canSubmitPass;
    case 'RETURNED': return gate.canSubmitReturn;
    case 'FAIL': return gate.canSubmitFail;
  }
}
