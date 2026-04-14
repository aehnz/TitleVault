import { DocRef } from '@udhbha/types';

// Rights Event System - Append-Only Legal Records
// Rights are stored as EVENTS, claims are COMPUTED from events
// IMMUTABILITY RULES: origin="APPROVED_BASELINE" events are NEVER editable

// All possible rights event kinds
export type RightsEventKind =
  | 'ADD_OWNERSHIP'
  | 'TRANSFER_OWNERSHIP'
  | 'ADD_LEASE'
  | 'END_LEASE'
  | 'ADD_OCCUPANCY'
  | 'END_OCCUPANCY'
  | 'ADD_MORTGAGE'
  | 'RELEASE_MORTGAGE'
  | 'OPEN_DISPUTE'
  | 'RESOLVE_DISPUTE'
  | 'ADD_EASEMENT'
  | 'END_EASEMENT';

// Target levels for rights
export type TargetLevel = 'PARCEL' | 'BUILDING' | 'FLOOR' | 'UNIT' | 'COMMON_AREA';

// Event origin - tracks if from approved baseline or current draft
export type EventOrigin = 'APPROVED_BASELINE' | 'DRAFT';

// Draft state - for draft events that can be undone
export type DraftState = 'ACTIVE' | 'UNDONE';

// Rights event target
export interface RightsEventTarget {
  level: TargetLevel;
  id: string;
}

// Rights event payload - varies by kind
export interface OwnershipPayload {
  holder: string;        // DID or name
  share: number;         // 0.0 - 1.0
  previous_holder?: string; // For transfers
}

export interface LeasePayload {
  lessor: string;
  lessee: string;
  start_date: string;
  end_date?: string;
  rent_amount?: string;
}

export interface OccupancyPayload {
  occupant: string;
  purpose?: string;
}

export interface MortgagePayload {
  mortgagor: string;     // Property owner
  mortgagee: string;     // Lender
  principal?: string;
  registration_no?: string;
}

export interface DisputePayload {
  claimant: string;
  respondent: string;
  case_no?: string;
  nature: string;        // Brief description
  resolution?: string;   // For RESOLVE_DISPUTE
}

export interface EasementPayload {
  beneficiary: string;
  nature: string;        // Type of easement (e.g., "right of way")
}

export type RightsEventPayload = 
  | OwnershipPayload 
  | LeasePayload 
  | OccupancyPayload 
  | MortgagePayload 
  | DisputePayload
  | EasementPayload;

// The core rights event structure
export interface RightsEvent {
  event_id: string;
  kind: RightsEventKind;
  ts: string;            // ISO timestamp
  target: RightsEventTarget;
  payload: RightsEventPayload;
  docs: DocRef[];        // Document references (lightweight refs)
  note?: string;         // Optional audit note
  // Metadata for tracking
  created_at?: string;
  created_by?: string;
  // NEW: Origin and draft state tracking
  origin: EventOrigin;           // Where this event came from
  draft_state?: DraftState;      // For DRAFT origin events, tracks if undone
}

// Computed claim status
export type ClaimStatus = 'ACTIVE' | 'ENDED' | 'TRANSFERRED' | 'RESOLVED' | 'RELEASED';

// Computed claim structures (read-only, derived from events)
export interface ComputedOwnership {
  id: string;
  target: RightsEventTarget;
  holder: string;
  share: number;
  status: ClaimStatus;
  start_date: string;
  end_date?: string;
  source_event_id: string;
  end_event_id?: string;
}

export interface ComputedLease {
  id: string;
  target: RightsEventTarget;
  lessor: string;
  lessee: string;
  status: ClaimStatus;
  start_date: string;
  end_date?: string;
  rent_amount?: string;
  source_event_id: string;
  end_event_id?: string;
}

export interface ComputedOccupancy {
  id: string;
  target: RightsEventTarget;
  occupant: string;
  purpose?: string;
  status: ClaimStatus;
  start_date: string;
  end_date?: string;
  source_event_id: string;
  end_event_id?: string;
}

export interface ComputedMortgage {
  id: string;
  target: RightsEventTarget;
  mortgagor: string;
  mortgagee: string;
  principal?: string;
  registration_no?: string;
  status: ClaimStatus;
  start_date: string;
  end_date?: string;
  source_event_id: string;
  end_event_id?: string;
}

export interface ComputedDispute {
  id: string;
  target: RightsEventTarget;
  claimant: string;
  respondent: string;
  case_no?: string;
  nature: string;
  resolution?: string;
  status: ClaimStatus;
  start_date: string;
  end_date?: string;
  source_event_id: string;
  end_event_id?: string;
}

export interface ComputedEasement {
  id: string;
  target: RightsEventTarget;
  beneficiary: string;
  nature: string;
  status: ClaimStatus;
  start_date: string;
  end_date?: string;
  source_event_id: string;
  end_event_id?: string;
}

// The computed claims snapshot (READ-ONLY)
export interface ComputedClaims {
  ownership: ComputedOwnership[];
  leases: ComputedLease[];
  occupancies: ComputedOccupancy[];
  mortgages: ComputedMortgage[];
  disputes: ComputedDispute[];
  easements: ComputedEasement[];
}

// Rights event kind metadata for UI
export interface RightsEventKindMeta {
  kind: RightsEventKind;
  label: string;
  description: string;
  category: 'ownership' | 'lease' | 'occupancy' | 'mortgage' | 'dispute' | 'easement';
  isTerminating: boolean;  // True if this ends/resolves something
  icon: string;
}

export const RIGHTS_EVENT_KINDS: RightsEventKindMeta[] = [
  { kind: 'ADD_OWNERSHIP', label: 'Add Ownership', description: 'Register new ownership', category: 'ownership', isTerminating: false, icon: 'UserPlus' },
  { kind: 'TRANSFER_OWNERSHIP', label: 'Transfer Ownership', description: 'Transfer ownership to new holder', category: 'ownership', isTerminating: true, icon: 'ArrowRightLeft' },
  { kind: 'ADD_LEASE', label: 'Add Lease', description: 'Register new lease agreement', category: 'lease', isTerminating: false, icon: 'FileSignature' },
  { kind: 'END_LEASE', label: 'End Lease', description: 'Terminate lease agreement', category: 'lease', isTerminating: true, icon: 'FileX' },
  { kind: 'ADD_OCCUPANCY', label: 'Add Occupancy', description: 'Register occupant', category: 'occupancy', isTerminating: false, icon: 'Home' },
  { kind: 'END_OCCUPANCY', label: 'Vacate', description: 'End occupancy', category: 'occupancy', isTerminating: true, icon: 'DoorOpen' },
  { kind: 'ADD_MORTGAGE', label: 'Add Mortgage', description: 'Register mortgage encumbrance', category: 'mortgage', isTerminating: false, icon: 'Landmark' },
  { kind: 'RELEASE_MORTGAGE', label: 'Release Mortgage', description: 'Release mortgage lien', category: 'mortgage', isTerminating: true, icon: 'Unlock' },
  { kind: 'OPEN_DISPUTE', label: 'Open Dispute', description: 'Register property dispute', category: 'dispute', isTerminating: false, icon: 'AlertTriangle' },
  { kind: 'RESOLVE_DISPUTE', label: 'Resolve Dispute', description: 'Record dispute resolution', category: 'dispute', isTerminating: true, icon: 'CheckCircle' },
  { kind: 'ADD_EASEMENT', label: 'Add Easement', description: 'Register easement right', category: 'easement', isTerminating: false, icon: 'Route' },
  { kind: 'END_EASEMENT', label: 'End Easement', description: 'Terminate easement', category: 'easement', isTerminating: true, icon: 'X' },
];

// Get terminating event kind for a category
export function getTerminatingEventKind(category: string): RightsEventKind | null {
  switch (category) {
    case 'ownership': return 'TRANSFER_OWNERSHIP';
    case 'lease': return 'END_LEASE';
    case 'occupancy': return 'END_OCCUPANCY';
    case 'mortgage': return 'RELEASE_MORTGAGE';
    case 'dispute': return 'RESOLVE_DISPUTE';
    case 'easement': return 'END_EASEMENT';
    default: return null;
  }
}

// Get adding event kind for a category
export function getAddEventKind(category: string): RightsEventKind | null {
  switch (category) {
    case 'ownership': return 'ADD_OWNERSHIP';
    case 'lease': return 'ADD_LEASE';
    case 'occupancy': return 'ADD_OCCUPANCY';
    case 'mortgage': return 'ADD_MORTGAGE';
    case 'dispute': return 'OPEN_DISPUTE';
    case 'easement': return 'ADD_EASEMENT';
    default: return null;
  }
}

// Get action label for terminating an existing right
export function getTerminatingActionLabel(category: string): string {
  switch (category) {
    case 'ownership': return 'Transfer';
    case 'lease': return 'End Lease';
    case 'occupancy': return 'Vacate';
    case 'mortgage': return 'Release';
    case 'dispute': return 'Resolve';
    case 'easement': return 'End';
    default: return 'End';
  }
}

// Check if an event can be undone (only DRAFT origin with ACTIVE state)
export function canUndoEvent(event: RightsEvent, submissionStatus: string): boolean {
  // Must be a draft event
  if (event.origin !== 'DRAFT') return false;
  
  // Must be active (not already undone)
  if (event.draft_state === 'UNDONE') return false;
  
  // Submission must be in DRAFT or RETURNED status
  return submissionStatus === 'DRAFT' || submissionStatus === 'RETURNED';
}

// Check if an event can be restored (DRAFT origin with UNDONE state)
export function canRestoreEvent(event: RightsEvent, submissionStatus: string): boolean {
  // Must be a draft event
  if (event.origin !== 'DRAFT') return false;
  
  // Must be undone
  if (event.draft_state !== 'UNDONE') return false;
  
  // Submission must be in DRAFT or RETURNED status
  return submissionStatus === 'DRAFT' || submissionStatus === 'RETURNED';
}

// Get the category icon component name
export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'ownership': return 'User';
    case 'lease': return 'FileSignature';
    case 'occupancy': return 'Home';
    case 'mortgage': return 'Landmark';
    case 'dispute': return 'AlertTriangle';
    case 'easement': return 'Route';
    default: return 'Gavel';
  }
}
