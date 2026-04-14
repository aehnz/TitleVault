/**
 * @udhbha/types — Document Types
 * Single source of truth for document references, metadata, and storage.
 * Merged from surveyhub-registry/src/types/document.ts + auditor DocumentRef/DocumentEntry
 */

export type DocumentType =
  | 'survey'
  | 'plan'
  | 'sale_deed'
  | 'lease'
  | 'title'
  | 'permit'
  | 'certificate'
  | 'mortgage'
  | 'court_order'
  | 'agreement'
  | 'affidavit'
  | 'other';

export type StorageProvider = 'LOCALHOST' | 'INDEXEDDB' | 'SUPABASE' | 'S3' | 'AZURE' | 'GCS';

export type StorageStatus = 'LOCAL' | 'UPLOADED' | 'MISSING';

/** Lightweight reference stored in entity.docs[] */
export interface DocRef {
  id: string;
  name: string;
  type: DocumentType;
}

/** Full metadata stored in documents_index */
export interface DocumentMeta {
  id: string;
  name: string;
  type: DocumentType;
  mime: string;
  size?: number;
  storage: {
    provider: StorageProvider;
    ref: string;
  };
  hash: string;
  created_at: string;
  created_by: string;
}

/** The central document index */
export interface DocumentsIndex {
  [docId: string]: DocumentMeta;
}

/** Auditor document review status */
export type DocReviewStatus = 'PENDING' | 'VALID' | 'MISSING' | 'ILLEGIBLE' | 'MISMATCH';

export interface DocumentReview {
  doc_id: string;
  status: DocReviewStatus;
  comment: string;
  reviewed_at: string;
}

// --- Helper Functions ---

export function isDocRef(value: unknown): value is DocRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value
  );
}

export function stringToDocRef(docId: string): DocRef {
  return { id: docId, name: docId, type: 'other' };
}

export function createDocumentId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `doc_${timestamp}_${random}`;
}

/** Document type labels for UI */
export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  survey: 'Survey',
  plan: 'Plan',
  sale_deed: 'Sale Deed',
  lease: 'Lease',
  title: 'Title',
  permit: 'Permit',
  certificate: 'Certificate',
  mortgage: 'Mortgage',
  court_order: 'Court Order',
  agreement: 'Agreement',
  affidavit: 'Affidavit',
  other: 'Other'
};

/** Document type colors for badges */
export const DOC_TYPE_COLORS: Record<DocumentType, string> = {
  survey: 'bg-blue-500/20 text-blue-700',
  plan: 'bg-emerald-500/20 text-emerald-700',
  sale_deed: 'bg-orange-500/20 text-orange-700',
  lease: 'bg-amber-500/20 text-amber-700',
  title: 'bg-purple-500/20 text-purple-700',
  permit: 'bg-cyan-500/20 text-cyan-700',
  certificate: 'bg-pink-500/20 text-pink-700',
  mortgage: 'bg-gray-500/20 text-gray-700',
  court_order: 'bg-red-500/20 text-red-700',
  agreement: 'bg-indigo-500/20 text-indigo-700',
  affidavit: 'bg-violet-500/20 text-violet-700',
  other: 'bg-muted text-muted-foreground'
};
