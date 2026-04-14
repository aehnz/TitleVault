// ============================================
// PUBLIC REPOSITORY
// Read-only facade for public transparency data
// ============================================

import { computeOwnership } from '../../auditor/validators/validateRights';

import { AuditReport, ChainAnchor, HoldingResult, OwnershipClaim, PublicRecordData, RegistrarRecord, Submission, TransparencyBundle, UnitOwnershipResult } from '@udhbha/types';


export const PublicRepo = {
  /**
   * Resolve record by parcel ID (latest approved submission)
   */
  async resolveByParcelId(parcelId: string): Promise<PublicRecordData | null> {
    const approved = await SubmissionRepo.listByStatus(['APPROVED']);
    const matching = approved.filter(s => s.parcel.parcel_id === parcelId);
    
    if (matching.length === 0) return null;
    
    // Get the latest by revision number
    const latest = matching.reduce((a, b) => 
      (a.meta.revision_number || 0) > (b.meta.revision_number || 0) ? a : b
    );
    
    return this.buildRecordData(latest);
  },

  /**
   * Resolve record by submission ID
   */
  async resolveBySubmissionId(submissionId: string): Promise<PublicRecordData | null> {
    const submission = await SubmissionRepo.getById(submissionId);
    if (!submission) return null;
    
    // Only return approved submissions for public view
    if (submission.meta.status !== 'APPROVED') return null;
    
    return this.buildRecordData(submission);
  },

  /**
   * Resolve record by transaction hash
   */
  async resolveByTxHash(txHash: string): Promise<PublicRecordData | null> {
    const allRecords = await RegistrarRepo.getAll();
    const record = allRecords.find(r => r.chain_anchor?.tx_hash === txHash);
    
    if (!record) return null;
    
    return this.resolveBySubmissionId(record.submission_id);
  },

  /**
   * Resolve record by bundle hash
   */
  async resolveByBundleHash(bundleHash: string): Promise<PublicRecordData | null> {
    const allRecords = await RegistrarRepo.getAll();
    const record = allRecords.find(r => r.chain_anchor?.bundle_hash === bundleHash);
    
    if (!record) return null;
    
    return this.resolveBySubmissionId(record.submission_id);
  },

  /**
   * Build complete record data from submission
   */
  async buildRecordData(submission: Submission): Promise<PublicRecordData> {
    const [parent, auditReport, registrarRecord, transparencyBundle] = await Promise.all([
      SubmissionRepo.getParent(submission),
      AuditRepo.getBySubmissionId(submission.meta.submission_id),
      RegistrarRepo.getBySubmissionId(submission.meta.submission_id),
      TransparencyRepo.getBySubmissionId(submission.meta.submission_id),
    ]);

    return {
      submission,
      parent,
      auditReport,
      registrarRecord,
      transparencyBundle,
      chainAnchor: registrarRecord?.chain_anchor || null,
    };
  },

  /**
   * Find all holdings by owner ID
   */
  async findHoldingsByOwner(ownerId: string): Promise<HoldingResult[]> {
    const approved = await SubmissionRepo.listByStatus(['APPROVED']);
    const results: HoldingResult[] = [];
    
    // Group by parcel to get latest revisions
    const latestByParcel = new Map<string, Submission>();
    for (const sub of approved) {
      const existing = latestByParcel.get(sub.parcel.parcel_id);
      if (!existing || (sub.meta.revision_number || 0) > (existing.meta.revision_number || 0)) {
        latestByParcel.set(sub.parcel.parcel_id, sub);
      }
    }
    
    // Check ownership in each latest submission
    for (const submission of latestByParcel.values()) {
      const parent = await SubmissionRepo.getParent(submission);
      const claims = computeOwnership(
        parent?.rights_events || [],
        submission.rights_events
      );
      
      // Find active claims matching owner
      const matching = claims.filter(
        c => c.active && c.holder.toLowerCase() === ownerId.toLowerCase()
      );
      
      for (const claim of matching) {
        const component = submission.components.find(c => c.component_id === claim.target_id);
        const floor = submission.floors.find(f => f.floor_id === component?.floor_id);
        
        results.push({
          parcelId: submission.parcel.parcel_id,
          parcelName: submission.parcel.name || submission.parcel.parcel_id,
          submissionId: submission.meta.submission_id,
          componentId: claim.target_id,
          componentLabel: component?.label || claim.target_id,
          componentType: component?.type || 'UNIT',
          floorId: floor?.floor_id || '',
          floorLabel: floor?.label || '',
          share: claim.share,
          link: `/public/parcel/${submission.parcel.parcel_id}`,
        });
      }
    }
    
    return results;
  },

  /**
   * Check ownership of a specific component
   */
  async checkComponentOwnership(
    componentId: string,
    ownerId?: string
  ): Promise<UnitOwnershipResult | null> {
    const approved = await SubmissionRepo.listByStatus(['APPROVED']);
    
    // Find submission containing this component
    let targetSubmission: Submission | null = null;
    let targetComponent = null;
    
    for (const sub of approved) {
      const comp = sub.components.find(c => c.component_id === componentId);
      if (comp) {
        if (!targetSubmission || (sub.meta.revision_number || 0) > (targetSubmission.meta.revision_number || 0)) {
          targetSubmission = sub;
          targetComponent = comp;
        }
      }
    }
    
    if (!targetSubmission || !targetComponent) return null;
    
    const parent = await SubmissionRepo.getParent(targetSubmission);
    const claims = computeOwnership(
      parent?.rights_events || [],
      targetSubmission.rights_events
    );
    
    // Get active claims for this component
    const activeClaims = claims.filter(
      c => c.active && c.target_id === componentId
    );
    
    // Find floor
    const floor = targetSubmission.floors.find(f => f.floor_id === targetComponent.floor_id);
    
    // Find last transfer event
    const allEvents = [...(parent?.rights_events || []), ...targetSubmission.rights_events];
    const transferEvents = allEvents
      .filter(e => 
        e.target.id === componentId && 
        ['TRANSFER_OWNERSHIP', 'ADD_OWNERSHIP'].includes(e.kind) &&
        e.draft_state !== 'UNDONE'
      )
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    
    // Get chain anchor
    const registrarRecord = await RegistrarRepo.getBySubmissionId(targetSubmission.meta.submission_id);
    
    // Check if provided owner matches
    let isOwner: boolean | undefined;
    if (ownerId) {
      isOwner = activeClaims.some(c => c.holder.toLowerCase() === ownerId.toLowerCase());
    }
    
    return {
      componentId,
      componentLabel: targetComponent.label || componentId,
      componentType: targetComponent.type,
      floorId: floor?.floor_id || '',
      floorLabel: floor?.label || '',
      parcelId: targetSubmission.parcel.parcel_id,
      parcelName: targetSubmission.parcel.name || targetSubmission.parcel.parcel_id,
      currentOwners: activeClaims.map(c => ({
        holder: c.holder,
        maskedHolder: maskHolderId(c.holder),
        share: c.share,
        fromTs: c.from_ts,
        fromEventId: c.from_event_id,
      })),
      lastTransferEvent: transferEvents[0] || null,
      chainAnchor: registrarRecord?.chain_anchor || null,
      isOwner,
    };
  },

  /**
   * Get all approved submissions (for listings)
   */
  async getAllApproved(): Promise<Submission[]> {
    return SubmissionRepo.listByStatus(['APPROVED']);
  },
};
