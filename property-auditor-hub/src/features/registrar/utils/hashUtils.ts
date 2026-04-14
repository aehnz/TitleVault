import { AuditReport, ComputedHashes, Submission } from '@udhbha/types';

// ============================================
// HASH UTILITIES
// Canonical JSON hashing for blockchain anchoring
// ============================================

/**
 * Stable JSON stringify with sorted keys
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }
  
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalStringify(item)).join(',') + ']';
  }
  
  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map(key => {
    const value = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalStringify(value);
  });
  
  return '{' + pairs.join(',') + '}';
}

/**
 * Simple SHA256-like hash using Web Crypto API simulation
 * In production, use proper crypto library
 */
export async function sha256(data: string): Promise<string> {
  // Use TextEncoder to convert string to Uint8Array
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Try to use Web Crypto API if available
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback to simple hash
    }
  }
  
  // Fallback: simple hash for demo purposes
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

/**
 * Compute all required hashes for blockchain anchoring
 */
export async function computeHashes(
  parent: Submission | null,
  submission: Submission,
  auditReport: AuditReport
): Promise<ComputedHashes> {
  const parentCanonical = parent ? canonicalStringify(parent) : '';
  const submissionCanonical = canonicalStringify(submission);
  const auditCanonical = canonicalStringify(auditReport);
  
  const parentHash = parent ? await sha256(parentCanonical) : 'sha256:null_parent';
  const submissionHash = await sha256(submissionCanonical);
  const auditHash = await sha256(auditCanonical);
  
  // Bundle hash is hash of concatenated hashes
  const bundleData = `${parentHash}|${submissionHash}|${auditHash}`;
  const bundleHash = await sha256(bundleData);
  
  return {
    parent_hash: parentHash,
    submission_hash: submissionHash,
    audit_hash: auditHash,
    bundle_hash: bundleHash,
  };
}

/**
 * Generate a demo transaction hash
 */
export function generateDemoTxHash(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `0xDEMO_${timestamp}_${random}`;
}

/**
 * Mask a holder ID for transparency (e.g., did:user:ali -> did:user:a***i)
 */
export function maskHolderId(holder: string): string {
  if (!holder || holder.length < 6) return holder;
  
  const prefix = holder.substring(0, holder.lastIndexOf(':') + 1);
  const id = holder.substring(holder.lastIndexOf(':') + 1);
  
  if (id.length <= 2) return holder;
  
  return `${prefix}${id[0]}***${id[id.length - 1]}`;
}
