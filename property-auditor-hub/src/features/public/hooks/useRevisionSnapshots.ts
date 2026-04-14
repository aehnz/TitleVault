// ============================================
// USE REVISION SNAPSHOTS HOOK
// Precomputes geometry snapshots for each revision
// ============================================

import { useMemo } from 'react';

import { Building, Component, Floor, OwnershipClaim, RevisionSnapshot, Submission } from '@udhbha/types';


interface UseRevisionSnapshotsProps {
  submission: Submission;
  parent: Submission | null;
}

export function useRevisionSnapshots({ submission, parent }: UseRevisionSnapshotsProps) {
  const snapshots = useMemo((): RevisionSnapshot[] => {
    const result: RevisionSnapshot[] = [];

    // Baseline snapshot from parent (if exists)
    if (parent) {
      const parentClaims = computeOwnership([], parent.rights_events);
      
      result.push({
        revisionNumber: parent.meta.revision_number || 0,
        timestamp: parent.meta.updated_at || parent.meta.created_at || '',
        parcel: parent.parcel,
        buildings: parent.buildings,
        floors: parent.floors,
        components: parent.components,
        geometryStore: parent.geometry_store,
        topologyEvents: parent.topology_events.filter(e => e.draft_state !== 'UNDONE'),
        rightsEvents: parent.rights_events.filter(e => e.draft_state !== 'UNDONE'),
        claims: parentClaims,
      });
    }

    // Current revision snapshot
    const currentClaims = computeOwnership(
      parent?.rights_events || [],
      submission.rights_events
    );

    // Merge parent geometry into current revision snapshot for self-contained rendering
    result.push({
      revisionNumber: submission.meta.revision_number || 1,
      timestamp: submission.meta.updated_at || submission.meta.created_at || '',
      parcel: submission.parcel,
      buildings: submission.buildings,
      floors: submission.floors,
      components: submission.components,
      geometryStore: {
        ...(parent?.geometry_store || {}),  // Base from parent
        ...submission.geometry_store,        // Overrides from current
      },
      topologyEvents: submission.topology_events.filter(e => e.draft_state !== 'UNDONE'),
      rightsEvents: submission.rights_events.filter(e => e.draft_state !== 'UNDONE'),
      claims: currentClaims,
    });

    return result;
  }, [submission, parent]);

  const getSnapshotAtRevision = (revisionNumber: number): RevisionSnapshot | null => {
    return snapshots.find(s => s.revisionNumber === revisionNumber) || null;
  };

  const latestSnapshot = snapshots[snapshots.length - 1] || null;
  const baselineSnapshot = snapshots.length > 1 ? snapshots[0] : null;

  return {
    snapshots,
    getSnapshotAtRevision,
    latestSnapshot,
    baselineSnapshot,
  };
}
