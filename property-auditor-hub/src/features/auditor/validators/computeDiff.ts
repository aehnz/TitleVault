import { DiffItem, Submission, SubmissionDiff } from '@udhbha/types';

// ============================================
// COMPUTE DIFF VALIDATOR
// Compares parent and revision submissions
// ============================================

/**
 * Compute differences between parent and revision submissions
 */
export function computeDiff(
  parent: Submission | null,
  revision: Submission
): SubmissionDiff {
  const diff: SubmissionDiff = {
    topology: [],
    rights: [],
    geometry: [],
  };

  if (!parent) {
    // Baseline submission - everything is "added"
    return diff;
  }

  // Compute floor diffs
  const parentFloorIds = new Set(parent.floors.map(f => f.floor_id));
  const revisionFloorIds = new Set(revision.floors.map(f => f.floor_id));

  // Added floors
  revision.floors.forEach(floor => {
    if (!parentFloorIds.has(floor.floor_id)) {
      const addEvent = revision.topology_events.find(
        e => e.kind === 'ADD_FLOOR' && 
        (e.payload as { floor_id?: string }).floor_id === floor.floor_id
      );
      diff.topology.push({
        action: 'ADDED',
        entity_type: 'FLOOR',
        entity_id: floor.floor_id,
        label: `Floor ${floor.label} (Level ${floor.level})`,
        event_id: addEvent?.event_id,
        details: addEvent?.note,
      });
    }
  });

  // Removed floors
  parent.floors.forEach(floor => {
    if (!revisionFloorIds.has(floor.floor_id)) {
      const removeEvent = revision.topology_events.find(
        e => e.kind === 'REMOVE_FLOOR' && 
        (e.payload as { floor_id?: string }).floor_id === floor.floor_id
      );
      diff.topology.push({
        action: 'REMOVED',
        entity_type: 'FLOOR',
        entity_id: floor.floor_id,
        label: `Floor ${floor.label} (Level ${floor.level})`,
        event_id: removeEvent?.event_id,
        details: removeEvent?.note,
      });
    }
  });

  // Compute component diffs
  const parentComponentIds = new Set(parent.components.map(c => c.component_id));
  const revisionComponentIds = new Set(revision.components.map(c => c.component_id));

  // Added components
  revision.components.forEach(comp => {
    if (!parentComponentIds.has(comp.component_id)) {
      const addEvent = revision.topology_events.find(
        e => e.kind === 'ADD_COMPONENT' && 
        (e.payload as { component_id?: string }).component_id === comp.component_id
      );
      diff.topology.push({
        action: 'ADDED',
        entity_type: 'COMPONENT',
        entity_id: comp.component_id,
        label: `${comp.label} (${comp.type})`,
        event_id: addEvent?.event_id,
        details: addEvent?.note,
      });
    }
  });

  // Removed components
  parent.components.forEach(comp => {
    if (!revisionComponentIds.has(comp.component_id)) {
      const removeEvent = revision.topology_events.find(
        e => e.kind === 'REMOVE_COMPONENT' && 
        (e.payload as { component_id?: string }).component_id === comp.component_id
      );
      diff.topology.push({
        action: 'REMOVED',
        entity_type: 'COMPONENT',
        entity_id: comp.component_id,
        label: `${comp.label} (${comp.type})`,
        event_id: removeEvent?.event_id,
        details: removeEvent?.note,
      });
    }
  });

  // Compute geometry diffs
  const parentGeomKeys = new Set(Object.keys(parent.geometry_store));
  
  Object.keys(revision.geometry_store).forEach(key => {
    if (!parentGeomKeys.has(key)) {
      diff.geometry.push({
        action: 'ADDED',
        entity_type: 'GEOMETRY',
        entity_id: key,
        label: key,
      });
    }
  });

  // Compute rights diffs (active events only)
  revision.rights_events
    .filter(e => e.draft_state !== 'UNDONE')
    .forEach(event => {
      diff.rights.push({
        action: event.kind.includes('ADD') ? 'ADDED' : 
                event.kind.includes('TRANSFER') ? 'MODIFIED' : 
                event.kind.includes('REMOVE') ? 'REMOVED' : 'MODIFIED',
        entity_type: 'OWNERSHIP',
        entity_id: event.target.id,
        label: `${event.kind} on ${event.target.id}`,
        event_id: event.event_id,
        details: event.note,
      });
    });

  return diff;
}
