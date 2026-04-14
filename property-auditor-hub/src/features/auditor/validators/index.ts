// ============================================
// VALIDATORS INDEX
// Re-export all validator functions
// ============================================

export { detectChangeKind, validateChangeKind } from './detectChangeKind';
export { computeDiff } from './computeDiff';
export { validateGeometry } from './validateGeometry';
export { validateRights, computeOwnership } from './validateRights';
export { 
  validateDocs, 
  aggregateDocuments, 
  computeRequiredDocs,
  computeRequiredDocsEnhanced,
} from './validateDocs';
export {
  computeDecisionGate,
  getBlockersForDecision,
  canOpenDecision,
  canSubmitDecision,
  type DecisionGateInputs,
  type DecisionGateOutputs,
  type DecisionType,
} from './decisionGate';
