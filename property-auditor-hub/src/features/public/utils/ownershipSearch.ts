// ============================================
// OWNERSHIP SEARCH UTILITIES
// Functions for finding holdings and checking unit ownership
// ============================================

import { computeOwnership } from '../../auditor/validators/validateRights';

import { ChainAnchor, Component, Floor, HoldingResult, OwnershipClaim, Submission, UnitOwnershipResult } from '@udhbha/types';


/**
 * Find all holdings for a given owner across all submissions
 */
export function findHoldingsInSubmission(
  submission: Submission,
  parent: Submission | null,
  ownerId: string
): HoldingResult[] {
  const claims = computeOwnership(
    parent?.rights_events || [],
    submission.rights_events
  );

  const activeClaims = claims.filter(
    c => c.active && c.holder.toLowerCase() === ownerId.toLowerCase()
  );

  return activeClaims.map(claim => {
    const component = submission.components.find(c => c.component_id === claim.target_id);
    const floor = submission.floors.find(f => f.floor_id === component?.floor_id);

    return {
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
    };
  });
}

/**
 * Check ownership of a specific component
 */
export function checkComponentOwnershipInSubmission(
  submission: Submission,
  parent: Submission | null,
  componentId: string,
  ownerId?: string,
  chainAnchor?: ChainAnchor | null
): UnitOwnershipResult | null {
  const component = submission.components.find(c => c.component_id === componentId);
  if (!component) return null;

  const floor = submission.floors.find(f => f.floor_id === component.floor_id);
  const claims = computeOwnership(
    parent?.rights_events || [],
    submission.rights_events
  );

  const activeClaims = claims.filter(c => c.active && c.target_id === componentId);

  // Find last transfer event
  const allEvents = [...(parent?.rights_events || []), ...submission.rights_events];
  const transferEvents = allEvents
    .filter(e =>
      e.target.id === componentId &&
      ['TRANSFER_OWNERSHIP', 'ADD_OWNERSHIP'].includes(e.kind) &&
      e.draft_state !== 'UNDONE'
    )
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  let isOwner: boolean | undefined;
  if (ownerId) {
    isOwner = activeClaims.some(c => c.holder.toLowerCase() === ownerId.toLowerCase());
  }

  return {
    componentId,
    componentLabel: component.label || componentId,
    componentType: component.type,
    floorId: floor?.floor_id || '',
    floorLabel: floor?.label || '',
    parcelId: submission.parcel.parcel_id,
    parcelName: submission.parcel.name || submission.parcel.parcel_id,
    currentOwners: activeClaims.map(c => ({
      holder: c.holder,
      maskedHolder: maskHolderId(c.holder),
      share: c.share,
      fromTs: c.from_ts,
      fromEventId: c.from_event_id,
    })),
    lastTransferEvent: transferEvents[0] || null,
    chainAnchor: chainAnchor || null,
    isOwner,
  };
}

/**
 * Get owned component IDs for highlighting in 3D view
 */
export function getOwnedComponentIds(
  submission: Submission,
  parent: Submission | null,
  ownerId: string
): Set<string> {
  const claims = computeOwnership(
    parent?.rights_events || [],
    submission.rights_events
  );

  return new Set(
    claims
      .filter(c => c.active && c.holder.toLowerCase() === ownerId.toLowerCase())
      .map(c => c.target_id)
  );
}
