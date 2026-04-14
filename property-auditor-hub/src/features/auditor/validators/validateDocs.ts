import { DocReviewStatus, DocumentCheckResult, DocumentCheckResults, DocumentRef, DocumentReview, DocumentsIndex, RequiredDocInfo, Submission } from '@udhbha/types';

// ============================================
// DOCUMENT VALIDATOR
// Validates required documents and completeness
// ============================================

interface RequiredDoc {
  doc_id: string;
  reason: string;
  entity_id: string;
  entity_type: string;
}

/**
 * Compute required documents based on events and structure (original)
 */
export function computeRequiredDocs(submission: Submission): RequiredDoc[] {
  const required: RequiredDoc[] = [];

  // 1. Any TRANSFER_OWNERSHIP requires sale_deed
  submission.rights_events
    .filter(e => e.kind === 'TRANSFER_OWNERSHIP' && e.draft_state !== 'UNDONE')
    .forEach(event => {
      const hasSaleDeed = event.docs.some(d => d.type === 'sale_deed');
      if (!hasSaleDeed) {
        required.push({
          doc_id: `required_sale_deed_${event.event_id}`,
          reason: `TRANSFER_OWNERSHIP event requires sale_deed document`,
          entity_id: event.event_id,
          entity_type: 'EVENT',
        });
      }
    });

  // 2. ADD_FLOOR requires plan document
  submission.topology_events
    .filter(e => e.kind === 'ADD_FLOOR')
    .forEach(event => {
      const hasPlan = event.docs.some(d => d.type === 'plan');
      if (!hasPlan) {
        required.push({
          doc_id: `required_plan_${event.event_id}`,
          reason: `ADD_FLOOR event requires plan document`,
          entity_id: event.event_id,
          entity_type: 'EVENT',
        });
      }
    });

  // 3. ADD_COMPONENT requires plan or sale_deed
  submission.topology_events
    .filter(e => e.kind === 'ADD_COMPONENT')
    .forEach(event => {
      const hasDoc = event.docs.some(
        d => d.type === 'plan' || d.type === 'sale_deed'
      );
      if (!hasDoc) {
        required.push({
          doc_id: `required_doc_${event.event_id}`,
          reason: `ADD_COMPONENT event requires plan or sale_deed document`,
          entity_id: event.event_id,
          entity_type: 'EVENT',
        });
      }
    });

  // 4. ADD_OWNERSHIP requires sale_deed
  submission.rights_events
    .filter(e => e.kind === 'ADD_OWNERSHIP' && e.draft_state !== 'UNDONE')
    .forEach(event => {
      const hasSaleDeed = event.docs.some(d => d.type === 'sale_deed');
      if (!hasSaleDeed) {
        required.push({
          doc_id: `required_sale_deed_${event.event_id}`,
          reason: `ADD_OWNERSHIP event requires sale_deed document`,
          entity_id: event.event_id,
          entity_type: 'EVENT',
        });
      }
    });

  return required;
}

/**
 * Enhanced required docs computation - returns info about which docs are required
 * and whether they are found
 */
export function computeRequiredDocsEnhanced(submission: Submission): RequiredDocInfo[] {
  const required: RequiredDocInfo[] = [];

  // 1. TRANSFER_OWNERSHIP requires sale_deed
  submission.rights_events
    .filter(e => e.kind === 'TRANSFER_OWNERSHIP' && e.draft_state !== 'UNDONE')
    .forEach(event => {
      const saleDeed = event.docs.find(d => d.type === 'sale_deed');
      required.push({
        doc_id: saleDeed?.id || `required_sale_deed_${event.event_id}`,
        doc_type: 'sale_deed',
        reason: `Transfer of ownership requires sale deed`,
        event_id: event.event_id,
        entity_type: 'EVENT',
        found: !!saleDeed,
      });
    });

  // 2. ADD_FLOOR requires plan
  submission.topology_events
    .filter(e => e.kind === 'ADD_FLOOR')
    .forEach(event => {
      const plan = event.docs.find(d => d.type === 'plan');
      required.push({
        doc_id: plan?.id || `required_plan_${event.event_id}`,
        doc_type: 'plan',
        reason: `Floor addition requires plan document`,
        event_id: event.event_id,
        entity_type: 'EVENT',
        found: !!plan,
      });
    });

  // 3. ADD_COMPONENT requires plan or sale_deed
  submission.topology_events
    .filter(e => e.kind === 'ADD_COMPONENT')
    .forEach(event => {
      const doc = event.docs.find(d => d.type === 'plan' || d.type === 'sale_deed');
      required.push({
        doc_id: doc?.id || `required_doc_${event.event_id}`,
        doc_type: 'plan|sale_deed',
        reason: `Component addition requires plan or sale deed`,
        event_id: event.event_id,
        entity_type: 'EVENT',
        found: !!doc,
      });
    });

  // 4. ADD_OWNERSHIP requires sale_deed
  submission.rights_events
    .filter(e => e.kind === 'ADD_OWNERSHIP' && e.draft_state !== 'UNDONE')
    .forEach(event => {
      const saleDeed = event.docs.find(d => d.type === 'sale_deed');
      required.push({
        doc_id: saleDeed?.id || `required_sale_deed_${event.event_id}`,
        doc_type: 'sale_deed',
        reason: `Ownership registration requires sale deed`,
        event_id: event.event_id,
        entity_type: 'EVENT',
        found: !!saleDeed,
      });
    });

  return required;
}

/**
 * Aggregate all document references from the submission
 */
export function aggregateDocuments(
  parent: Submission | null,
  submission: Submission
): DocumentRef[] {
  const docRefs: DocumentRef[] = [];
  const seen = new Set<string>();

  const addDoc = (doc: DocumentRef) => {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      docRefs.push(doc);
    }
  };

  // From parent if exists
  if (parent) {
    parent.parcel.docs.forEach(addDoc);
    parent.buildings.forEach(b => b.docs.forEach(addDoc));
    parent.floors.forEach(f => f.docs.forEach(addDoc));
    parent.components.forEach(c => c.docs.forEach(addDoc));
    parent.rights_events.forEach(e => e.docs.forEach(addDoc));
    parent.topology_events.forEach(e => e.docs.forEach(addDoc));
  }

  // From revision
  submission.parcel.docs.forEach(addDoc);
  submission.buildings.forEach(b => b.docs.forEach(addDoc));
  submission.floors.forEach(f => f.docs.forEach(addDoc));
  submission.components.forEach(c => c.docs.forEach(addDoc));
  submission.rights_events.forEach(e => e.docs.forEach(addDoc));
  submission.topology_events.forEach(e => e.docs.forEach(addDoc));

  return docRefs;
}

/**
 * Validate documents against requirements
 */
export function validateDocs(
  parent: Submission | null,
  submission: Submission,
  documentReviews: DocumentReview[]
): DocumentCheckResults {
  const allDocs = aggregateDocuments(parent, submission);
  const requiredDocsInfo = computeRequiredDocsEnhanced(submission);
  
  // Merge documents index
  const docsIndex: DocumentsIndex = {
    ...(parent?.documents_index || {}),
    ...submission.documents_index,
  };

  const reviewMap = new Map(
    documentReviews.map(r => [r.doc_id, r])
  );

  // Set of required doc IDs
  const requiredDocIds = new Set(
    requiredDocsInfo.filter(r => r.found).map(r => r.doc_id)
  );

  const results: DocumentCheckResult[] = [];
  let overallStatus: 'PASS' | 'FAIL' | 'WARN' = 'PASS';

  // Check each document
  allDocs.forEach(doc => {
    const entry = docsIndex[doc.id];
    const review = reviewMap.get(doc.id);
    const isRequired = requiredDocIds.has(doc.id);

    const status: DocReviewStatus = review?.status || 'PENDING';
    
    results.push({
      doc_id: doc.id,
      doc_name: doc.name,
      required: isRequired,
      status,
      comment: review?.comment || '',
    });

    if (isRequired && status === 'PENDING') {
      overallStatus = 'WARN';
    }
    if (isRequired && (status === 'MISSING' || status === 'ILLEGIBLE' || status === 'MISMATCH')) {
      overallStatus = 'FAIL';
    }
  });

  // Add missing required docs (not found at all)
  requiredDocsInfo
    .filter(req => !req.found)
    .forEach(req => {
      results.push({
        doc_id: req.doc_id,
        doc_name: req.reason,
        required: true,
        status: 'MISSING',
        comment: req.reason,
      });
      overallStatus = 'FAIL';
    });

  return {
    status: overallStatus,
    doc_results: results,
  };
}
