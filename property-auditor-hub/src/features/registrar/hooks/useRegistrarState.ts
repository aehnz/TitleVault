// ============================================
// REGISTRAR STATE HOOK
// Manages local registrar state for review page
// ============================================

import { useState, useCallback, useMemo } from 'react';

import { AuditReport, ChainAnchor, ComputedHashes, RegistrarDecision, RegistrarNotes, RegistrarReason, RegistrarRecord, RegistrarState, Submission, TransparencyBundle } from '@udhbha/types';


interface UseRegistrarStateOptions {
  submission: Submission;
  parent: Submission | null;
  auditReport: AuditReport;
}

export function useRegistrarState({ submission, parent, auditReport }: UseRegistrarStateOptions) {
  const [state, setState] = useState<RegistrarState>({
    submission_id: submission.meta.submission_id,
    decision: null,
    reasons: [],
    notes: { public: '', internal: '' },
    hashes: null,
    chain_anchor: null,
    transparency_bundle: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const settings = getRegistrarSettings();

  // Decision gate logic
  const decisionGate = useMemo(() => {
    const canApprove = 
      submission.meta.status === 'AUDIT_PASSED' &&
      auditReport.decision === 'PASS';

    const approveBlockers: string[] = [];
    const returnBlockers: string[] = [];
    const rejectBlockers: string[] = [];

    if (!canApprove && settings.strictApproveOnlyAuditPass) {
      approveBlockers.push('Submission must be AUDIT_PASSED with audit decision PASS');
    }

    if (!state.hashes && !settings.allowApproveWithoutAnchor) {
      approveBlockers.push('Compute hashes before approving');
    }

    if (!state.chain_anchor && !settings.allowApproveWithoutAnchor) {
      approveBlockers.push('Anchor on chain before approving');
    }

    // RETURNED requires at least one reason + public note
    if (state.reasons.length === 0) {
      returnBlockers.push('Add at least one reason');
    }
    if (!state.notes.public.trim()) {
      returnBlockers.push('Add a public note');
    }

    // REJECT requires at least one reason + internal note
    if (state.reasons.length === 0) {
      rejectBlockers.push('Add at least one reason');
    }
    if (!state.notes.internal.trim()) {
      rejectBlockers.push('Add an internal note');
    }

    return {
      canApprove: approveBlockers.length === 0,
      canReturn: returnBlockers.length === 0,
      canReject: rejectBlockers.length === 0,
      approveBlockers,
      returnBlockers,
      rejectBlockers,
    };
  }, [submission, auditReport, state, settings]);

  // Actions
  const setDecision = useCallback((decision: RegistrarDecision | null) => {
    setState(prev => ({ ...prev, decision }));
  }, []);

  const addReason = useCallback((reason: RegistrarReason) => {
    setState(prev => ({
      ...prev,
      reasons: [...prev.reasons, reason],
    }));
  }, []);

  const removeReason = useCallback((code: string) => {
    setState(prev => ({
      ...prev,
      reasons: prev.reasons.filter(r => r.code !== code),
    }));
  }, []);

  const updateNotes = useCallback((notes: Partial<RegistrarNotes>) => {
    setState(prev => ({
      ...prev,
      notes: { ...prev.notes, ...notes },
    }));
  }, []);

  const computeHashesAction = useCallback(async () => {
    const hashes = await computeHashes(parent, submission, auditReport);
    setState(prev => ({ ...prev, hashes }));
    return hashes;
  }, [parent, submission, auditReport]);

  const anchorOnChain = useCallback(async () => {
    if (!state.hashes) {
      throw new Error('Compute hashes first');
    }

    const anchor: ChainAnchor = {
      network: 'DEMO',
      tx_hash: generateDemoTxHash(),
      anchored_at: new Date().toISOString(),
      ...state.hashes,
    };

    setState(prev => ({ ...prev, chain_anchor: anchor }));
    return anchor;
  }, [state.hashes]);

  const generateTransparencyBundle = useCallback((maskHolders: boolean = true, maskDocRefs: boolean = true): TransparencyBundle => {
    const diff = computeDiff(parent, submission);
    
    const topologySummary = diff.topology.map(d => 
      `${d.action} ${d.entity_type.toLowerCase()} ${d.label}`
    );
    
    const rightsSummary = diff.rights.map(d => {
      const event = submission.rights_events.find(e => e.event_id === d.event_id);
      if (event && event.kind === 'TRANSFER_OWNERSHIP') {
        const from = maskHolders ? maskHolderId(event.payload.previous_holder || '') : event.payload.previous_holder;
        const to = maskHolders ? maskHolderId(event.payload.holder || '') : event.payload.holder;
        return `Transferred ${d.entity_id}: ${from} -> ${to}`;
      }
      if (event && event.kind === 'ADD_OWNERSHIP') {
        const holder = maskHolders ? maskHolderId(event.payload.holder || '') : event.payload.holder;
        return `Added ownership ${d.entity_id}: ${holder}`;
      }
      return d.label;
    });

    const bundle: TransparencyBundle = {
      transparency_bundle: {
        public_id: `pub_${submission.parcel.parcel_id}_${submission.meta.revision_number}`,
        parcel_id: submission.parcel.parcel_id,
        submission_id: submission.meta.submission_id,
        revision_number: submission.meta.revision_number,
        change_summary: {
          topology: topologySummary,
          rights: rightsSummary,
        },
        audit: {
          decision: auditReport.decision,
          public_notes: auditReport.notes.public,
          public_reasons: auditReport.reasons
            .filter(r => r.severity !== 'LOW')
            .map(r => r.message),
        },
        registrar: {
          decision: state.decision || 'PENDING',
          public_notes: state.notes.public,
        },
        proof: {
          bundle_hash: state.hashes?.bundle_hash || '',
          submission_hash: state.hashes?.submission_hash || '',
          audit_hash: state.hashes?.audit_hash || '',
          parent_hash: state.hashes?.parent_hash || '',
          tx_hash: state.chain_anchor?.tx_hash || '',
        },
        redactions: {
          mask_holders: maskHolders,
          mask_doc_storage_refs: maskDocRefs,
        },
      },
    };

    setState(prev => ({ ...prev, transparency_bundle: bundle }));
    return bundle;
  }, [parent, submission, auditReport, state]);

  const submitDecision = useCallback(async (): Promise<RegistrarRecord> => {
    if (!state.decision) {
      throw new Error('No decision selected');
    }

    const session = getRegistrarSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    setIsSubmitting(true);
    try {
      const record: RegistrarRecord = {
        record_id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        submission_id: submission.meta.submission_id,
        parent_submission_id: submission.meta.parent_submission_id,
        registrar_id: session.email,
        decided_at: new Date().toISOString(),
        decision: state.decision,
        reasons: state.reasons,
        notes: state.notes,
        chain_anchor: state.chain_anchor,
      };

      await RegistrarRepo.saveRecord(record);

      // Save transparency bundle if generated
      if (state.transparency_bundle) {
        await TransparencyRepo.saveBundle(submission.meta.submission_id, state.transparency_bundle);
      }

      return record;
    } finally {
      setIsSubmitting(false);
    }
  }, [submission, state]);

  return {
    state,
    decisionGate,
    setDecision,
    addReason,
    removeReason,
    updateNotes,
    computeHashes: computeHashesAction,
    anchorOnChain,
    generateTransparencyBundle,
    submitDecision,
    isSubmitting,
  };
}
