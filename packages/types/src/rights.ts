/**
 * @udhbha/types — Rights Event System
 * Single source of truth for append-only legal records.
 * Direct copy from surveyhub-registry/src/types/rights.ts (canonical version).
 * Auditor's simpler RightsEvent is a subset — this is the superset.
 */

import { DocRef } from './document';

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

export type TargetLevel = 'PARCEL' | 'BUILDING' | 'FLOOR' | 'UNIT' | 'COMMON_AREA';
export type EventOrigin = 'APPROVED_BASELINE' | 'DRAFT';
export type DraftState = 'ACTIVE' | 'UNDONE';

export interface RightsEventTarget {
  level: TargetLevel;
  id: string;
}

// --- Payload types ---

export interface OwnershipPayload {
  holder: string;
  share: number;
  previous_holder?: string;
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
  mortgagor: string;
  mortgagee: string;
  principal?: string;
  registration_no?: string;
}

export interface DisputePayload {
  claimant: string;
  respondent: string;
  case_no?: string;
  nature: string;
  resolution?: string;
}

export interface EasementPayload {
  beneficiary: string;
  nature: string;
}

export type RightsEventPayload =
  | OwnershipPayload
  | LeasePayload
  | OccupancyPayload
  | MortgagePayload
  | DisputePayload
  | EasementPayload;

// --- Core Event Structure ---

export interface RightsEvent {
  event_id: string;
  kind: RightsEventKind;
  ts: string;
  target: RightsEventTarget;
  payload: RightsEventPayload;
  docs: DocRef[];
  note?: string;
  created_at?: string;
  created_by?: string;
  origin: EventOrigin;
  draft_state?: DraftState;
}

// --- Computed Claims (read-only, derived from events) ---

export type ClaimStatus = 'ACTIVE' | 'ENDED' | 'TRANSFERRED' | 'RESOLVED' | 'RELEASED';

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

export interface ComputedClaims {
  ownership: ComputedOwnership[];
  leases: ComputedLease[];
  occupancies: ComputedOccupancy[];
  mortgages: ComputedMortgage[];
  disputes: ComputedDispute[];
  easements: ComputedEasement[];
}

// --- UI Metadata ---

export interface RightsEventKindMeta {
  kind: RightsEventKind;
  label: string;
  description: string;
  category: 'ownership' | 'lease' | 'occupancy' | 'mortgage' | 'dispute' | 'easement';
  isTerminating: boolean;
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

// --- Helper Functions ---

export function getTerminatingEventKind(category: string): RightsEventKind | null {
  const map: Record<string, RightsEventKind> = {
    ownership: 'TRANSFER_OWNERSHIP', lease: 'END_LEASE',
    occupancy: 'END_OCCUPANCY', mortgage: 'RELEASE_MORTGAGE',
    dispute: 'RESOLVE_DISPUTE', easement: 'END_EASEMENT',
  };
  return map[category] ?? null;
}

export function getAddEventKind(category: string): RightsEventKind | null {
  const map: Record<string, RightsEventKind> = {
    ownership: 'ADD_OWNERSHIP', lease: 'ADD_LEASE',
    occupancy: 'ADD_OCCUPANCY', mortgage: 'ADD_MORTGAGE',
    dispute: 'OPEN_DISPUTE', easement: 'ADD_EASEMENT',
  };
  return map[category] ?? null;
}

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

export function canUndoEvent(event: RightsEvent, submissionStatus: string): boolean {
  if (event.origin !== 'DRAFT') return false;
  if (event.draft_state === 'UNDONE') return false;
  return submissionStatus === 'DRAFT' || submissionStatus === 'RETURNED';
}

export function canRestoreEvent(event: RightsEvent, submissionStatus: string): boolean {
  if (event.origin !== 'DRAFT') return false;
  if (event.draft_state !== 'UNDONE') return false;
  return submissionStatus === 'DRAFT' || submissionStatus === 'RETURNED';
}
