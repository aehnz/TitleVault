// ============================================
// PUBLIC FEATURE EXPORTS
// Barrel file for public transparency feature
// ============================================

// Pages
export { TransparencyPage } from './pages/TransparencyPage';

// Components
export { PublicLayout } from './components/PublicLayout';
export { SearchBar } from './components/SearchBar';
export { TrustSummaryCard } from './components/TrustSummaryCard';
export { ChainProofSection } from './components/ChainProofSection';
export { HistoryTimeline } from './components/HistoryTimeline';
export { OwnershipSnapshotPanel } from './components/OwnershipSnapshotPanel';
export { PublicDocumentsTable } from './components/PublicDocumentsTable';

// Hooks
export { usePublicSearch } from './hooks/usePublicSearch';
export { useRevisionSnapshots } from './hooks/useRevisionSnapshots';

// Repos
export { PublicRepo } from './repos/PublicRepo';

// Utils
export { parseSearchInput, getSearchPlaceholder, validateInputForMode } from './utils/searchResolver';
export { isAadhaarLike, maskAadhaarInput, maskHolderId, sanitizeForPublic, getAadhaarWarning } from './utils/privacyUtils';
export { findHoldingsInSubmission, checkComponentOwnershipInSubmission, getOwnedComponentIds } from './utils/ownershipSearch';

// Types
export type {
  SearchMode,
  DetectedInputType,
  ParsedSearchInput,
  PublicRecordData,
  RevisionSnapshot,
  HoldingResult,
  UnitOwnershipResult,
  PublicSearchState,
  TimelineItem,
  TimelineItemType,
  VerificationResult,
  PublicExportBundle,
} from './types';
