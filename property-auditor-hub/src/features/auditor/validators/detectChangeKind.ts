import { ChangeKind, Submission } from '@udhbha/types';

// ============================================
// DETECT CHANGE KIND VALIDATOR
// Computes actual change kind from events
// ============================================

/**
 * Detect the actual change kind based on submission content
 */
export function detectChangeKind(submission: Submission): ChangeKind {
  // Baseline if no parent
  if (!submission.meta.parent_submission_id) {
    return 'BASELINE';
  }

  const hasTopologyEvents = submission.topology_events.length > 0;
  const hasRightsEvents = submission.rights_events.filter(
    e => e.draft_state !== 'UNDONE'
  ).length > 0;

  if (hasTopologyEvents && hasRightsEvents) {
    return 'TOPOLOGY_AND_RIGHTS';
  }

  if (hasTopologyEvents) {
    return 'TOPOLOGY_ONLY';
  }

  if (hasRightsEvents) {
    return 'RIGHTS_ONLY';
  }

  // Check for document changes only
  const hasDocs = 
    submission.parcel.docs.length > 0 ||
    submission.buildings.some(b => b.docs.length > 0) ||
    submission.floors.some(f => f.docs.length > 0) ||
    submission.components.some(c => c.docs.length > 0);

  if (hasDocs) {
    return 'DOCUMENT_UPDATE';
  }

  return 'AUTO';
}

/**
 * Check if meta.change_kind matches detected change kind
 */
export function validateChangeKind(submission: Submission): {
  isValid: boolean;
  declared: ChangeKind;
  detected: ChangeKind;
  message?: string;
} {
  const declared = submission.meta.change_kind;
  const detected = detectChangeKind(submission);

  // AUTO is always valid as it indicates system should detect
  if (declared === 'AUTO') {
    return { isValid: true, declared, detected };
  }

  const isValid = declared === detected;
  
  return {
    isValid,
    declared,
    detected,
    message: isValid 
      ? undefined 
      : `Declared change_kind '${declared}' does not match detected '${detected}'`
  };
}
