import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

import { ChangeKind, SubmissionPayload, SubmissionStatus } from '@udhbha/types';


interface SubmissionContextType {
  submissions: SubmissionPayload[];
  currentSubmission: SubmissionPayload | null;
  loadSubmissions: () => Promise<void>;
  loadSubmission: (id: string) => Promise<void>;
  createNewSubmission: () => Promise<string>;
  updateCurrentSubmission: (updates: Partial<SubmissionPayload>) => void;
  saveDraft: () => Promise<void>;
  submitSubmission: (metaUpdates?: { change_kind?: ChangeKind; change_note?: string }) => Promise<void>;
  returnSubmission: (comment: string) => Promise<void>;
  approveSubmission: () => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
  setCurrentSubmission: (submission: SubmissionPayload | null) => void;
  // Revision functions
  createRevision: (parentId: string, changeKind: ChangeKind, changeNote: string) => Promise<string | null>;
  getRevisionChain: (submissionId: string) => SubmissionPayload[];
}

const SubmissionContext = createContext<SubmissionContextType | undefined>(undefined);

export const SubmissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionPayload[]>([]);
  const [currentSubmission, setCurrentSubmission] = useState<SubmissionPayload | null>(null);

  const loadSubmissions = useCallback(async () => {
    const data = await getSubmissions(user?.email);
    setSubmissions(data);
  }, [user?.email]);

  const loadSubmission = useCallback(async (id: string) => {
    const data = await getSubmission(id);
    setCurrentSubmission(data);
  }, []);

  const createNewSubmission = useCallback(async (): Promise<string> => {
    if (!user) return '';
    const newSubmission = createEmptySubmission(user.email);
    // Set revision_number to 1 for new submissions
    newSubmission.meta.revision_number = 1;
    await saveSubmission(newSubmission);
    setCurrentSubmission(newSubmission);
    await loadSubmissions();
    return newSubmission.meta.submission_id;
  }, [user, loadSubmissions]);

  const updateCurrentSubmission = useCallback((updates: Partial<SubmissionPayload>) => {
    if (!currentSubmission) return;

    // Check if submission is locked
    if (currentSubmission.meta.locked === true) {
      toast.error('Locked record cannot be edited');
      return;
    }

    const updated = { ...currentSubmission, ...updates };
    updated.meta.updated_at = new Date().toISOString();
    setCurrentSubmission(updated);
  }, [currentSubmission]);

  const saveDraft = useCallback(async () => {
    if (!currentSubmission) return;

    // Check if submission is locked
    if (currentSubmission.meta.locked === true) {
      toast.error('Locked record cannot be saved');
      return;
    }

    await saveSubmission(currentSubmission);
    await loadSubmissions();
  }, [currentSubmission, loadSubmissions]);

  const submitSubmission = useCallback(async (metaUpdates?: { change_kind?: ChangeKind; change_note?: string }) => {
    if (!currentSubmission) return;
    const updated = { ...currentSubmission };

    // Apply optional meta updates (for revision submissions)
    if (metaUpdates) {
      if (metaUpdates.change_kind) {
        updated.meta.change_kind = metaUpdates.change_kind;
      }
      if (metaUpdates.change_note) {
        updated.meta.change_note = metaUpdates.change_note;
      }
    }

    updated.meta.status = 'SUBMITTED';
    // Remove auto-locking here to allow surveyor edits until Auditor locks it
    updated.meta.updated_at = new Date().toISOString();
    setCurrentSubmission(updated);
    await saveSubmission(updated);
    await loadSubmissions();
  }, [currentSubmission, loadSubmissions]);

  const returnSubmission = useCallback(async (comment: string) => {
    if (!currentSubmission) return;
    const updated = { ...currentSubmission };
    updated.meta.status = 'RETURNED';
    updated.meta.return_comment = comment;
    updated.meta.locked = false; // Unlock on return
    updated.meta.updated_at = new Date().toISOString();
    setCurrentSubmission(updated);
    await saveSubmission(updated);
    await loadSubmissions();
  }, [currentSubmission, loadSubmissions]);

  const approveSubmission = useCallback(async () => {
    if (!currentSubmission) return;
    const updated = { ...currentSubmission };
    updated.meta.status = 'APPROVED';
    updated.meta.locked = true; // Lock on approve
    updated.meta.revision_number = updated.meta.revision_number ?? 1;
    updated.meta.updated_at = new Date().toISOString();

    // RULE 7: Convert all DRAFT events to APPROVED_BASELINE and remove UNDONE events
    const finalizedEvents = (updated.rights_events || [])
      // Filter out UNDONE draft events
      .filter(e => !(e.origin === 'DRAFT' && e.draft_state === 'UNDONE'))
      // Convert remaining DRAFT to APPROVED_BASELINE
      .map(e => {
        if (e.origin === 'DRAFT') {
          const { draft_state, ...rest } = e;
          return { ...rest, origin: 'APPROVED_BASELINE' as const };
        }
        return e;
      });

    updated.rights_events = finalizedEvents;

    // RULE 12: Ensure topology events have full ISO timestamps
    const finalizedTopologyEvents = (updated.topology_events || []).map(e => ({
      ...e,
      ts: e.ts.includes('T') ? e.ts : new Date(e.ts + 'T00:00:00.000Z').toISOString()
    }));
    updated.topology_events = finalizedTopologyEvents;

    // Compute final claims_current snapshot
    updated.claims_current = computeClaimsFromEvents(updated.rights_events);

    setCurrentSubmission(updated);
    await saveSubmission(updated);
    await loadSubmissions();
  }, [currentSubmission, loadSubmissions]);

  const deleteSubmission = useCallback(async (id: string) => {
    await deleteFromStorage(id);
    if (currentSubmission?.meta.submission_id === id) {
      setCurrentSubmission(null);
    }
    await loadSubmissions();
  }, [currentSubmission, loadSubmissions]);

  // Create a revision from an approved submission
  const createRevision = useCallback(async (
    parentId: string,
    changeKind: ChangeKind,
    changeNote: string
  ): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to create a revision');
      return null;
    }

    // Find the parent submission
    const parentSubmission = submissions.find(s => s.meta.submission_id === parentId);
    if (!parentSubmission) {
      toast.error('Parent submission not found');
      return null;
    }

    // Validate parent is approved
    if (parentSubmission.meta.status !== 'APPROVED') {
      toast.error('Can only create revisions from approved submissions');
      return null;
    }

    try {
      const revision = createRevisionFromApproved(
        parentSubmission,
        changeKind,
        changeNote,
        user.email
      );

      await saveSubmission(revision);
      setCurrentSubmission(revision);
      await loadSubmissions();

      toast.success(`Revision draft created (Rev. #${revision.meta.revision_number})`);
      return revision.meta.submission_id;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create revision');
      return null;
    }
  }, [user, submissions, loadSubmissions]);

  // Get the revision chain for a submission
  const getRevisionChain = useCallback((submissionId: string): SubmissionPayload[] => {
    return findRevisionChain(submissionId, submissions);
  }, [submissions]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  return (
    <SubmissionContext.Provider value={{
      submissions,
      currentSubmission,
      loadSubmissions,
      loadSubmission,
      createNewSubmission,
      updateCurrentSubmission,
      saveDraft,
      submitSubmission,
      returnSubmission,
      approveSubmission,
      deleteSubmission,
      setCurrentSubmission,
      createRevision,
      getRevisionChain,
    }}>
      {children}
    </SubmissionContext.Provider>
  );
};

export const useSubmissions = (): SubmissionContextType => {
  const context = useContext(SubmissionContext);
  if (!context) {
    throw new Error('useSubmissions must be used within a SubmissionProvider');
  }
  return context;
};
