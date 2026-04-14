import { IssueSeverity, ReasonCode } from '@udhbha/types';

// ============================================
// REASON CODES CONFIGURATION
// Grouped reason codes for audit decisions
// ============================================

interface ReasonCodeConfig {
  code: ReasonCode;
  label: string;
  description: string;
  severity: IssueSeverity;
  group: 'geometry' | 'rights' | 'documents' | 'workflow';
}

export const REASON_CODES: ReasonCodeConfig[] = [
  // Geometry
  {
    code: 'GEOM_INVALID',
    label: 'Invalid Geometry',
    description: 'Polygon is not properly formed or closed',
    severity: 'HIGH',
    group: 'geometry',
  },
  {
    code: 'FLOOR_OUTSIDE_BUILDING',
    label: 'Floor Outside Building',
    description: 'Floor outline extends beyond building footprint',
    severity: 'HIGH',
    group: 'geometry',
  },
  {
    code: 'COMPONENT_OUTSIDE_FLOOR',
    label: 'Component Outside Floor',
    description: 'Component/unit extends beyond its floor boundary',
    severity: 'HIGH',
    group: 'geometry',
  },
  {
    code: 'OVERLAPPING_COMPONENTS',
    label: 'Overlapping Components',
    description: 'Two or more components overlap on the same floor',
    severity: 'HIGH',
    group: 'geometry',
  },

  // Rights
  {
    code: 'MULTIPLE_ACTIVE_OWNERSHIP',
    label: 'Multiple Active Owners',
    description: 'More than one active ownership claim on the same unit',
    severity: 'HIGH',
    group: 'rights',
  },
  {
    code: 'TRANSFER_PREV_HOLDER_MISMATCH',
    label: 'Transfer Holder Mismatch',
    description: 'Previous holder in transfer does not match current owner',
    severity: 'HIGH',
    group: 'rights',
  },
  {
    code: 'INVALID_HOLDER_ID',
    label: 'Invalid Holder ID',
    description: 'Holder identifier does not follow expected format',
    severity: 'MEDIUM',
    group: 'rights',
  },
  {
    code: 'RIGHTS_TARGET_NOT_FOUND',
    label: 'Rights Target Missing',
    description: 'Rights event targets a non-existent entity',
    severity: 'HIGH',
    group: 'rights',
  },

  // Documents
  {
    code: 'MISSING_REQUIRED_DOC',
    label: 'Missing Required Document',
    description: 'A required document for the event type is not provided',
    severity: 'HIGH',
    group: 'documents',
  },
  {
    code: 'DOC_ILLEGIBLE',
    label: 'Illegible Document',
    description: 'Document is unreadable or of insufficient quality',
    severity: 'HIGH',
    group: 'documents',
  },
  {
    code: 'DOC_MISMATCH',
    label: 'Document Mismatch',
    description: 'Document content does not match claimed information',
    severity: 'HIGH',
    group: 'documents',
  },

  // Workflow
  {
    code: 'CHANGE_KIND_MISMATCH',
    label: 'Change Kind Mismatch',
    description: 'Declared change kind does not match detected changes',
    severity: 'MEDIUM',
    group: 'workflow',
  },
];

export const REASON_GROUPS = {
  geometry: 'Geometry Issues',
  rights: 'Rights Issues',
  documents: 'Document Issues',
  workflow: 'Workflow Issues',
};

export function getReasonsByGroup(): Record<string, ReasonCodeConfig[]> {
  return REASON_CODES.reduce((acc, reason) => {
    if (!acc[reason.group]) {
      acc[reason.group] = [];
    }
    acc[reason.group].push(reason);
    return acc;
  }, {} as Record<string, ReasonCodeConfig[]>);
}

export function getReasonConfig(code: ReasonCode): ReasonCodeConfig | undefined {
  return REASON_CODES.find(r => r.code === code);
}
