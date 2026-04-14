// ============================================
// SEARCH RESOLVER
// Auto-detect input type for public search
// ============================================

import { DetectedInputType, ParsedSearchInput } from '@udhbha/types';


/**
 * Detect the type of search input and parse it
 */
export function parseSearchInput(raw: string): ParsedSearchInput {
  const trimmed = raw.trim();
  
  if (!trimmed) {
    return {
      raw,
      sanitized: '',
      type: 'UNKNOWN',
      isMasked: false,
    };
  }
  
  // Check for Aadhaar-like input first (12 digits)
  if (isAadhaarLike(trimmed)) {
    return {
      raw,
      sanitized: maskAadhaarInput(trimmed),
      type: 'AADHAAR_LIKE',
      isMasked: true,
      warning: getAadhaarWarning(),
    };
  }
  
  // Parcel ID: starts with prc_
  if (trimmed.toLowerCase().startsWith('prc_')) {
    return {
      raw,
      sanitized: trimmed,
      type: 'PARCEL_ID',
      isMasked: false,
    };
  }
  
  // Submission ID: starts with sub_
  if (trimmed.toLowerCase().startsWith('sub_')) {
    return {
      raw,
      sanitized: trimmed,
      type: 'SUBMISSION_ID',
      isMasked: false,
    };
  }
  
  // Transaction hash: starts with 0x
  if (trimmed.startsWith('0x')) {
    return {
      raw,
      sanitized: trimmed,
      type: 'TX_HASH',
      isMasked: false,
    };
  }
  
  // Bundle hash: starts with sha256:
  if (trimmed.toLowerCase().startsWith('sha256:')) {
    return {
      raw,
      sanitized: trimmed,
      type: 'BUNDLE_HASH',
      isMasked: false,
    };
  }
  
  // Owner ID: starts with did:user: or UID-
  if (trimmed.toLowerCase().startsWith('did:user:') || trimmed.toUpperCase().startsWith('UID-')) {
    return {
      raw,
      sanitized: trimmed,
      type: 'OWNER_ID',
      isMasked: false,
    };
  }
  
  // Component ID: starts with cmp_
  if (trimmed.toLowerCase().startsWith('cmp_')) {
    return {
      raw,
      sanitized: trimmed,
      type: 'COMPONENT_ID',
      isMasked: false,
    };
  }
  
  // Floor ID: starts with fl_
  if (trimmed.toLowerCase().startsWith('fl_')) {
    return {
      raw,
      sanitized: trimmed,
      type: 'FLOOR_ID',
      isMasked: false,
    };
  }
  
  // Unknown type
  return {
    raw,
    sanitized: trimmed,
    type: 'UNKNOWN',
    isMasked: false,
  };
}

/**
 * Get placeholder text for search input based on mode
 */
export function getSearchPlaceholder(mode: 'VERIFY_RECORD' | 'FIND_HOLDINGS' | 'CHECK_UNIT'): string {
  switch (mode) {
    case 'VERIFY_RECORD':
      return 'Enter parcel ID, submission ID, tx hash, or bundle hash...';
    case 'FIND_HOLDINGS':
      return 'Enter owner ID (e.g., did:user:ram or UID-DEMO-123456)...';
    case 'CHECK_UNIT':
      return 'Enter component ID (e.g., cmp_gf_101)...';
    default:
      return 'Search...';
  }
}

/**
 * Validate input for the given search mode
 */
export function validateInputForMode(
  parsed: ParsedSearchInput,
  mode: 'VERIFY_RECORD' | 'FIND_HOLDINGS' | 'CHECK_UNIT'
): { valid: boolean; error?: string } {
  if (parsed.type === 'AADHAAR_LIKE') {
    return {
      valid: false,
      error: parsed.warning,
    };
  }
  
  switch (mode) {
    case 'VERIFY_RECORD':
      if (['PARCEL_ID', 'SUBMISSION_ID', 'TX_HASH', 'BUNDLE_HASH'].includes(parsed.type)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: 'Please enter a valid parcel ID, submission ID, transaction hash, or bundle hash',
      };
      
    case 'FIND_HOLDINGS':
      if (parsed.type === 'OWNER_ID') {
        return { valid: true };
      }
      return {
        valid: false,
        error: 'Please enter a valid owner ID (e.g., did:user:ram)',
      };
      
    case 'CHECK_UNIT':
      if (['COMPONENT_ID', 'FLOOR_ID'].includes(parsed.type)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: 'Please enter a valid component ID (e.g., cmp_gf_101)',
      };
      
    default:
      return { valid: false, error: 'Unknown search mode' };
  }
}
