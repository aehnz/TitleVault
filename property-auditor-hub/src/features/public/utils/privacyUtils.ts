// ============================================
// PRIVACY UTILITIES
// Masking and Aadhaar detection for public view
// ============================================

/**
 * Check if input looks like an Aadhaar number (12 digits)
 */
export function isAadhaarLike(input: string): boolean {
  const cleaned = input.replace(/[\s-]/g, '');
  return /^\d{12}$/.test(cleaned);
}

/**
 * Mask an Aadhaar-like input immediately
 */
export function maskAadhaarInput(input: string): string {
  const cleaned = input.replace(/[\s-]/g, '');
  if (cleaned.length <= 4) return cleaned;
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

/**
 * Mask a holder ID for public display
 * Examples:
 *   did:user:ramprasad -> did:user:r***d
 *   UID-DEMO-123456 -> UID-DEMO-1***6
 */
export function maskHolderId(holder: string): string {
  if (!holder) return 'Unknown';
  
  // Find the last segment after : or -
  const separators = [':', '-'];
  let lastSepIndex = -1;
  let lastSep = '';
  
  for (const sep of separators) {
    const idx = holder.lastIndexOf(sep);
    if (idx > lastSepIndex) {
      lastSepIndex = idx;
      lastSep = sep;
    }
  }
  
  if (lastSepIndex === -1) {
    // No separator, mask the whole thing
    if (holder.length <= 2) return holder;
    return holder[0] + '***' + holder[holder.length - 1];
  }
  
  const prefix = holder.slice(0, lastSepIndex + 1);
  const suffix = holder.slice(lastSepIndex + 1);
  
  if (suffix.length <= 2) {
    return prefix + suffix;
  }
  
  return prefix + suffix[0] + '***' + suffix[suffix.length - 1];
}

/**
 * Sanitize data for public export by removing sensitive fields
 */
export function sanitizeForPublic<T extends Record<string, unknown>>(
  data: T,
  options: {
    maskHolders?: boolean;
    hideStorageRefs?: boolean;
  } = {}
): T {
  const { maskHolders = true, hideStorageRefs = true } = options;
  
  const sanitized = JSON.parse(JSON.stringify(data));
  
  function walk(obj: Record<string, unknown>) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      
      // Mask holder IDs
      if (maskHolders && key === 'holder' && typeof value === 'string') {
        obj[key] = maskHolderId(value);
      }
      
      // Hide storage references
      if (hideStorageRefs && key === 'storage' && typeof value === 'object') {
        obj[key] = { provider: 'REDACTED', ref: 'REDACTED' };
      }
      
      // Recurse into objects and arrays
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'object') walk(item as Record<string, unknown>);
          });
        } else {
          walk(value as Record<string, unknown>);
        }
      }
    }
  }
  
  walk(sanitized);
  return sanitized;
}

/**
 * Generate the Aadhaar warning message
 */
export function getAadhaarWarning(): string {
  return 'Use demo identity handle (e.g., did:user:ram). Aadhaar is not stored in this system.';
}
