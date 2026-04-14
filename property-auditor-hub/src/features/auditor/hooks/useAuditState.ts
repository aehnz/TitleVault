// ============================================
// AUDIT STATE HOOK
// Manages local audit state for review page
// Uses centralized decision gating logic
// ============================================

import { useState, useCallback, useMemo } from 'react';

import { 
  detectChangeKind, 
  validateGeometry, 
  validateRights, 
  validateDocs,
  aggregateDocuments,
  computeRequiredDocsEnhanced,
  computeDecisionGate,
  DecisionGateOutputs,
} from '../validators';
import { AuditDecision, AuditNotes, AuditReason, AuditReport, AuditState, DetectedChangeKind, DocReviewStatus, DocumentCheckResults, DocumentReview, FixHints, GeometryCheckResults, RightsCheckResults, Submission } from '@udhbha/types';


interface UseAuditStateOptions {
  submission: Submission;
  parent: Submission | null;
}

export function useAuditState({ submission, parent }: UseAuditStateOptions) {
  const [state, setState] = useState<AuditState>({
    submission_id: submission.meta.submission_id,
    decision: null,
    reasons: [],
    notes: { public: '', internal: '' },
    document_reviews: [],
    geometry_check_results: null,
    rights_check_results: null,
    document_check_results: null,
    override_enabled: false,
    geometryChecksRun: false,
    rightsChecksRun: false,
    docChecksRun: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get settings
  const settings = getAuditorSettings();

  // Computed values
  const detectedChangeKind = useMemo(
    () => detectChangeKind(submission),
    [submission]
  );

  const allDocs = useMemo(
    () => aggregateDocuments(parent, submission),
    [parent, submission]
  );

  const requiredDocs = useMemo(
    () => computeRequiredDocsEnhanced(submission),
    [submission]
  );

  // Check if all checks have been run
  const allChecksRun = useMemo(() => {
    return state.geometryChecksRun && state.rightsChecksRun && state.docChecksRun;
  }, [state.geometryChecksRun, state.rightsChecksRun, state.docChecksRun]);

  // Build required docs with their review status for decision gate
  const requiredDocsWithStatus = useMemo(() => {
    return requiredDocs
      .filter(r => r.found)
      .map(r => {
        const review = state.document_reviews.find(rev => rev.doc_id === r.doc_id);
        return {
          doc_id: r.doc_id,
          status: (review?.status || 'PENDING') as DocReviewStatus,
        };
      });
  }, [requiredDocs, state.document_reviews]);

  // === AUTO-GENERATE REASONS ===
  // Automatically generate reasons from document reviews and check failures
  const autoReasons = useMemo((): AuditReason[] => {
    const reasons: AuditReason[] = [];
    
    // From document reviews - MISSING, ILLEGIBLE, MISMATCH for required docs
    state.document_reviews.forEach(review => {
      const isRequired = requiredDocs.some(r => r.doc_id === review.doc_id && r.found);
      if (!isRequired) return;
      
      if (review.status === 'MISSING') {
        reasons.push({
          code: 'MISSING_REQUIRED_DOC',
          severity: 'HIGH',
          entity: { level: 'DOC', id: review.doc_id },
          message: `Required document ${review.doc_id} is missing`,
        });
      } else if (review.status === 'ILLEGIBLE') {
        reasons.push({
          code: 'DOC_ILLEGIBLE',
          severity: 'HIGH',
          entity: { level: 'DOC', id: review.doc_id },
          message: `Required document ${review.doc_id} is illegible`,
        });
      } else if (review.status === 'MISMATCH') {
        reasons.push({
          code: 'DOC_MISMATCH',
          severity: 'HIGH',
          entity: { level: 'DOC', id: review.doc_id },
          message: `Required document ${review.doc_id} has data mismatch`,
        });
      }
    });
    
    // From missing required docs (not found in submission)
    requiredDocs.forEach(req => {
      if (!req.found) {
        reasons.push({
          code: 'MISSING_REQUIRED_DOC',
          severity: 'HIGH',
          entity: { level: 'EVENT', id: req.event_id },
          message: req.reason,
        });
      }
    });
    
    // From failed geometry checks
    state.geometry_check_results?.results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        if (r.entity_id && r.entity_type) {
          reasons.push({
            code: 'GEOM_INVALID',
            severity: 'HIGH',
            entity: { level: r.entity_type as any, id: r.entity_id },
            message: r.message,
          });
        }
      });
    
    // From failed rights checks
    state.rights_check_results?.results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        if (r.entity_id) {
          reasons.push({
            code: 'RIGHTS_TARGET_NOT_FOUND',
            severity: 'HIGH',
            entity: { level: 'EVENT', id: r.entity_id },
            message: r.message,
          });
        }
      });
    
    return reasons;
  }, [state.document_reviews, state.geometry_check_results, state.rights_check_results, requiredDocs]);

  // Combine manual + auto reasons (deduped)
  const allReasons = useMemo((): AuditReason[] => {
    const combined = [...state.reasons];
    autoReasons.forEach(auto => {
      const exists = combined.some(
        r => r.code === auto.code && r.entity.id === auto.entity.id
      );
      if (!exists) {
        combined.push(auto);
      }
    });
    return combined;
  }, [state.reasons, autoReasons]);

  // === DECISION GATE ===
  const decisionGate: DecisionGateOutputs = useMemo(() => {
    return computeDecisionGate({
      geometryChecksRun: state.geometryChecksRun,
      rightsChecksRun: state.rightsChecksRun,
      docChecksRun: state.docChecksRun,
      requireChecksBeforeDecision: settings.requireChecksBeforeDecision,
      strictMode: settings.strictMode,
      geometryStatus: state.geometry_check_results?.status || null,
      rightsStatus: state.rights_check_results?.status || null,
      docsStatus: state.document_check_results?.status || null,
      requiredDocs: requiredDocsWithStatus,
      selectedReasons: allReasons, // Use combined reasons instead of just manual
      publicNote: state.notes.public,
      internalNote: state.notes.internal,
      overrideEnabled: state.override_enabled,
    });
  }, [
    state.geometryChecksRun,
    state.rightsChecksRun,
    state.docChecksRun,
    state.geometry_check_results,
    state.rights_check_results,
    state.document_check_results,
    allReasons,
    state.notes.public,
    state.notes.internal,
    state.override_enabled,
    settings.requireChecksBeforeDecision,
    settings.strictMode,
    requiredDocsWithStatus,
  ]);

  // Actions
  const setDecision = useCallback((decision: AuditDecision | null) => {
    setState(prev => ({ ...prev, decision }));
  }, []);

  const addReason = useCallback((reason: AuditReason) => {
    setState(prev => ({
      ...prev,
      reasons: [...prev.reasons, reason],
    }));
  }, []);

  const removeReason = useCallback((code: string, entityId: string) => {
    setState(prev => ({
      ...prev,
      reasons: prev.reasons.filter(
        r => !(r.code === code && r.entity.id === entityId)
      ),
    }));
  }, []);

  const updateNotes = useCallback((notes: Partial<AuditNotes>) => {
    setState(prev => ({
      ...prev,
      notes: { ...prev.notes, ...notes },
    }));
  }, []);

  const updateDocumentReview = useCallback((review: DocumentReview) => {
    setState(prev => {
      const existing = prev.document_reviews.findIndex(
        r => r.doc_id === review.doc_id
      );
      const reviews = [...prev.document_reviews];
      
      if (existing >= 0) {
        reviews[existing] = review;
      } else {
        reviews.push(review);
      }
      
      return { ...prev, document_reviews: reviews };
    });
  }, []);

  const runGeometryChecks = useCallback(() => {
    const results = validateGeometry(parent, submission);
    setState(prev => ({ 
      ...prev, 
      geometry_check_results: results,
      geometryChecksRun: true,
    }));
    return results;
  }, [parent, submission]);

  const runRightsChecks = useCallback(() => {
    const results = validateRights(parent, submission);
    setState(prev => ({ 
      ...prev, 
      rights_check_results: results,
      rightsChecksRun: true,
    }));
    return results;
  }, [parent, submission]);

  const runDocChecks = useCallback(() => {
    const results = validateDocs(parent, submission, state.document_reviews);
    setState(prev => ({ 
      ...prev, 
      document_check_results: results,
      docChecksRun: true,
    }));
    return results;
  }, [parent, submission, state.document_reviews]);

  const runAllChecks = useCallback(() => {
    runGeometryChecks();
    runRightsChecks();
    runDocChecks();
  }, [runGeometryChecks, runRightsChecks, runDocChecks]);

  const toggleOverride = useCallback(() => {
    setState(prev => ({ ...prev, override_enabled: !prev.override_enabled }));
  }, []);

  // Generate fix hints from failed checks and reasons
  const generateFixHints = useCallback((): FixHints => {
    const entities: FixHints['entities'] = [];

    // Add from reasons
    state.reasons.forEach(reason => {
      entities.push({
        level: reason.entity.level,
        id: reason.entity.id,
        reason: reason.code,
      });
    });

    // Add from failed geometry checks
    state.geometry_check_results?.results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        if (r.entity_id && r.entity_type) {
          const existingReason = entities.find(e => e.id === r.entity_id);
          if (!existingReason) {
            entities.push({
              level: r.entity_type as any,
              id: r.entity_id,
              reason: 'GEOM_INVALID',
            });
          }
        }
      });

    // Add from failed rights checks
    state.rights_check_results?.results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        if (r.entity_id) {
          const existingReason = entities.find(e => e.id === r.entity_id);
          if (!existingReason) {
            entities.push({
              level: 'EVENT',
              id: r.entity_id,
              reason: 'RIGHTS_TARGET_NOT_FOUND',
            });
          }
        }
      });

    // Add from document issues
    const invalidDocs = state.document_reviews.filter(
      r => r.status === 'MISSING' || r.status === 'ILLEGIBLE' || r.status === 'MISMATCH'
    );
    invalidDocs.forEach(doc => {
      entities.push({
        level: 'DOC',
        id: doc.doc_id,
        reason: doc.status === 'MISSING' ? 'MISSING_REQUIRED_DOC' : 
                doc.status === 'ILLEGIBLE' ? 'DOC_ILLEGIBLE' : 'DOC_MISMATCH',
      });
    });

    return { entities };
  }, [state.reasons, state.geometry_check_results, state.rights_check_results, state.document_reviews]);

  // Generate audit report
  const generateReport = useCallback((): AuditReport => {
    const docResults = state.document_check_results || validateDocs(parent, submission, state.document_reviews);
    const geomResults = state.geometry_check_results || validateGeometry(parent, submission);
    const rightsResults = state.rights_check_results || validateRights(parent, submission);

    const now = new Date().toISOString();
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Count required docs from our enhanced logic
    const requiredDocsCount = requiredDocs.length;
    const foundRequiredDocs = requiredDocs.filter(r => r.found);
    
    // Count missing based on reviews
    const missingDocs = docResults.doc_results.filter(
      d => d.required && (d.status === 'MISSING' || d.status === 'PENDING')
    ).length;

    // Also add missing required docs that were not found
    const missingFromRules = requiredDocs.filter(r => !r.found).length;

    const checksFailed = 
      (geomResults.results.filter(r => r.status === 'FAIL').length) +
      (rightsResults.results.filter(r => r.status === 'FAIL').length) +
      (docResults.doc_results.filter(d => d.required && d.status !== 'VALID').length);

    // Simple hash preview (in production would be proper SHA256)
    const hashPreview = (data: unknown) => {
      const str = JSON.stringify(data);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `sha256_preview_${Math.abs(hash).toString(16)}`;
    };

    // Auto-add reasons for document issues in report
    const reportReasons = [...state.reasons];
    
    // Add MISSING_REQUIRED_DOC for invalid required docs
    requiredDocs.forEach(req => {
      if (!req.found) {
        const exists = reportReasons.some(
          r => r.code === 'MISSING_REQUIRED_DOC' && r.entity.id === req.event_id
        );
        if (!exists) {
          reportReasons.push({
            code: 'MISSING_REQUIRED_DOC',
            severity: 'HIGH',
            entity: { level: 'EVENT', id: req.event_id },
            message: req.reason,
          });
        }
      }
    });

    // Add for docs marked as MISSING/ILLEGIBLE/MISMATCH
    state.document_reviews
      .filter(r => r.status === 'MISSING' || r.status === 'ILLEGIBLE' || r.status === 'MISMATCH')
      .forEach(review => {
        const isRequired = requiredDocs.some(req => req.doc_id === review.doc_id);
        if (isRequired) {
          const exists = reportReasons.some(
            r => r.entity.id === review.doc_id
          );
          if (!exists) {
            reportReasons.push({
              code: review.status === 'MISSING' ? 'MISSING_REQUIRED_DOC' :
                    review.status === 'ILLEGIBLE' ? 'DOC_ILLEGIBLE' : 'DOC_MISMATCH',
              severity: 'HIGH',
              entity: { level: 'DOC', id: review.doc_id },
              message: `Document ${review.doc_id} is ${review.status.toLowerCase()}`,
            });
          }
        }
      });

    const report: AuditReport = {
      audit_id: auditId,
      submission_id: submission.meta.submission_id,
      parent_submission_id: submission.meta.parent_submission_id,
      auditor_id: 'auditor@demo.gov',
      audited_at: now,
      decision: state.decision!,
      change_kind_detected: detectedChangeKind as DetectedChangeKind,
      summary: {
        topology_events: submission.topology_events.length,
        rights_events: submission.rights_events.filter(e => e.draft_state !== 'UNDONE').length,
        docs_total: allDocs.length,
        docs_required: requiredDocsCount,
        docs_missing: missingDocs + missingFromRules,
        checks_failed: checksFailed,
      },
      checks: {
        geometry: geomResults,
        rights: rightsResults,
        documents: docResults,
      },
      reasons: reportReasons,
      notes: state.notes,
      integrity: {
        audit_hash_preview: hashPreview(state),
        inputs_hash_preview: hashPreview({ parent, submission }),
      },
      fix_hints: generateFixHints(),
    };

    return report;
  }, [parent, submission, state, detectedChangeKind, allDocs, requiredDocs, generateFixHints]);

  // Submit decision
  const submitDecision = useCallback(async () => {
    if (!state.decision) return;

    setIsSubmitting(true);
    try {
      const report = generateReport();
      await AuditRepo.saveDecision(
        submission.meta.submission_id,
        report,
        state.decision
      );
      return report;
    } finally {
      setIsSubmitting(false);
    }
  }, [state.decision, submission.meta.submission_id, generateReport]);

  return {
    state,
    detectedChangeKind,
    allDocs,
    requiredDocs,
    allChecksRun,
    
    // Decision gate (single source of truth)
    decisionGate,
    
    // Reasons (auto + manual combined)
    autoReasons,
    allReasons,
    
    // Actions
    setDecision,
    addReason,
    removeReason,
    updateNotes,
    updateDocumentReview,
    runGeometryChecks,
    runRightsChecks,
    runDocChecks,
    runAllChecks,
    toggleOverride,
    
    // Submit
    generateReport,
    submitDecision,
    isSubmitting,
  };
}
