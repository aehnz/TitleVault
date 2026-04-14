import { DocumentRef, Submission } from '@udhbha/types';

// ============================================
// DOCUMENT ATTACHMENT INDEX UTILITY
// Builds a map of doc_id → AttachmentRef[] for provenance tracking
// ============================================

// ============ ATTACHMENT REF TYPES ============
export type AttachmentRef =
  | { kind: 'PARCEL'; parcel_id: string; label: string }
  | { kind: 'BUILDING'; building_id: string; label: string }
  | { kind: 'FLOOR'; floor_id: string; level?: number; label: string }
  | { kind: 'COMPONENT'; component_id: string; floor_id: string; label: string; type?: string }
  | { kind: 'RIGHTS_EVENT'; event_id: string; event_kind: string; target_level: string; target_id: string; label: string }
  | { kind: 'TOPOLOGY_EVENT'; event_id: string; event_kind: string; target_entity?: string; target_id?: string; label: string };

export type DocAttachmentIndex = Record<string, AttachmentRef[]>;

/**
 * Normalize a doc ref (could be string or object) to just the doc ID
 */
function normalizeDocId(docRef: DocumentRef | string): string {
  if (typeof docRef === 'string') {
    return docRef;
  }
  return docRef.id;
}

/**
 * Build a complete attachment index from a submission
 * Maps each document ID to all entities that reference it
 */
export function buildDocAttachmentIndex(submission: Submission): DocAttachmentIndex {
  const index: DocAttachmentIndex = {};

  const addAttachment = (docId: string, ref: AttachmentRef) => {
    if (!index[docId]) {
      index[docId] = [];
    }
    // Avoid duplicates
    const exists = index[docId].some(existing => {
      if (existing.kind !== ref.kind) return false;
      switch (existing.kind) {
        case 'PARCEL': return (ref as typeof existing).parcel_id === existing.parcel_id;
        case 'BUILDING': return (ref as typeof existing).building_id === existing.building_id;
        case 'FLOOR': return (ref as typeof existing).floor_id === existing.floor_id;
        case 'COMPONENT': return (ref as typeof existing).component_id === existing.component_id;
        case 'RIGHTS_EVENT': return (ref as typeof existing).event_id === existing.event_id;
        case 'TOPOLOGY_EVENT': return (ref as typeof existing).event_id === existing.event_id;
        default: return false;
      }
    });
    if (!exists) {
      index[docId].push(ref);
    }
  };

  // 1. Parcel docs
  if (submission.parcel?.docs) {
    for (const doc of submission.parcel.docs) {
      const docId = normalizeDocId(doc);
      addAttachment(docId, {
        kind: 'PARCEL',
        parcel_id: submission.parcel.parcel_id,
        label: submission.parcel.name || submission.parcel.parcel_id,
      });
    }
  }

  // 2. Building docs
  for (const building of submission.buildings || []) {
    if (building.docs) {
      for (const doc of building.docs) {
        const docId = normalizeDocId(doc);
        addAttachment(docId, {
          kind: 'BUILDING',
          building_id: building.building_id,
          label: building.name || building.building_id,
        });
      }
    }
  }

  // 3. Floor docs
  for (const floor of submission.floors || []) {
    if (floor.docs) {
      for (const doc of floor.docs) {
        const docId = normalizeDocId(doc);
        addAttachment(docId, {
          kind: 'FLOOR',
          floor_id: floor.floor_id,
          level: floor.level,
          label: floor.label || `Level ${floor.level}`,
        });
      }
    }
  }

  // 4. Component docs
  for (const component of submission.components || []) {
    if (component.docs) {
      for (const doc of component.docs) {
        const docId = normalizeDocId(doc);
        addAttachment(docId, {
          kind: 'COMPONENT',
          component_id: component.component_id,
          floor_id: component.floor_id,
          label: component.label,
          type: component.type,
        });
      }
    }
  }

  // 5. Rights events docs
  for (const event of submission.rights_events || []) {
    if (event.docs) {
      for (const doc of event.docs) {
        const docId = normalizeDocId(doc);
        addAttachment(docId, {
          kind: 'RIGHTS_EVENT',
          event_id: event.event_id,
          event_kind: event.kind,
          target_level: event.target.level,
          target_id: event.target.id,
          label: `${event.kind} → ${event.target.level} ${event.target.id}`,
        });
      }
    }
  }

  // 6. Topology events docs
  for (const event of submission.topology_events || []) {
    if (event.docs) {
      for (const doc of event.docs) {
        const docId = normalizeDocId(doc);
        addAttachment(docId, {
          kind: 'TOPOLOGY_EVENT',
          event_id: event.event_id,
          event_kind: event.kind,
          target_entity: event.target.entity,
          target_id: event.target.id,
          label: `${event.kind} → ${event.target.entity} ${event.target.id}`,
        });
      }
    }
  }

  return index;
}

/**
 * Get a human-readable short label for an attachment ref
 */
export function getAttachmentShortLabel(ref: AttachmentRef): string {
  switch (ref.kind) {
    case 'PARCEL':
      return 'Parcel';
    case 'BUILDING':
      return 'Building';
    case 'FLOOR':
      return ref.level !== undefined ? `Floor: Level ${ref.level}` : 'Floor';
    case 'COMPONENT':
      return `Unit: ${ref.label}`;
    case 'RIGHTS_EVENT':
      return `Rights: ${ref.event_kind}`;
    case 'TOPOLOGY_EVENT':
      return `Topology: ${ref.event_kind}`;
  }
}

/**
 * Get tooltip text for an attachment ref
 */
export function getAttachmentTooltip(ref: AttachmentRef): string {
  switch (ref.kind) {
    case 'PARCEL':
      return `Attached to Parcel ${ref.parcel_id}`;
    case 'BUILDING':
      return `Attached to Building ${ref.building_id}`;
    case 'FLOOR':
      return `Attached to Floor ${ref.floor_id}`;
    case 'COMPONENT':
      return `Attached to Component ${ref.component_id}`;
    case 'RIGHTS_EVENT':
      return `Attached to Rights Event ${ref.event_id}`;
    case 'TOPOLOGY_EVENT':
      return `Attached to Topology Event ${ref.event_id}`;
  }
}
