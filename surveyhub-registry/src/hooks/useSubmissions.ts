/**
 * React Query hooks replacing the monolithic SubmissionContext.
 *
 * Each hook targets a precise slice of data so only the components that
 * care about that slice re-render when it changes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSubmissions,
  getSubmission,
  saveSubmission,
  deleteSubmission as deleteFromStorage,
} from '@/lib/storage';
import {
  createEmptySubmission,
} from '@/lib/demoData';
import { isSubmissionLocked } from '@/lib/revisions';
import { createRevisionFromApproved, findRevisionChain } from '@/lib/revisions';
import { computeClaimsFromEvents } from '@/lib/rightsEngine';
import { toast } from 'sonner';
import type { ChangeKind, SubmissionPayload } from '@udhbha/types';

// ─── Query keys ────────────────────────────────────────────────────
export const submissionKeys = {
  all: ['submissions'] as const,
  lists: () => [...submissionKeys.all, 'list'] as const,
  list: (email?: string) => [...submissionKeys.lists(), email] as const,
  details: () => [...submissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...submissionKeys.details(), id] as const,
};

// ─── List submissions ──────────────────────────────────────────────
export function useSubmissionList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: submissionKeys.list(user?.email),
    queryFn: () => getSubmissions(user?.email),
    enabled: !!user,
    staleTime: 30_000, // 30 s cache
  });
}

// ─── Single submission ─────────────────────────────────────────────
export function useSubmission(id: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.detail(id ?? ''),
    queryFn: () => getSubmission(id!),
    enabled: !!id,
  });
}

// ─── Create new submission ─────────────────────────────────────────
export function useCreateSubmission() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      const sub = createEmptySubmission(user.email);
      sub.meta.revision_number = 1;
      await saveSubmission(sub);
      return sub.meta.submission_id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });
}

// ─── Save draft (optimistic) ───────────────────────────────────────
export function useSaveDraft() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (submission: SubmissionPayload) => {
      if (isSubmissionLocked(submission)) {
        throw new Error('Locked record cannot be saved');
      }
      const updated = {
        ...submission,
        meta: { ...submission.meta, updated_at: new Date().toISOString() },
      };
      await saveSubmission(updated);
      return updated;
    },
    onSuccess: (updated) => {
      // Update the detail cache directly instead of refetching
      qc.setQueryData(
        submissionKeys.detail(updated.meta.submission_id),
        updated,
      );
      qc.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });
}

// ─── Submit for review ─────────────────────────────────────────────
export function useSubmitSubmission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submission,
      changeKind,
      changeNote,
    }: {
      submission: SubmissionPayload;
      changeKind?: ChangeKind;
      changeNote?: string;
    }) => {
      if (isSubmissionLocked(submission)) {
        throw new Error('Locked record cannot be submitted');
      }
      const updated: SubmissionPayload = {
        ...submission,
        meta: {
          ...submission.meta,
          status: 'SUBMITTED',
          updated_at: new Date().toISOString(),
          ...(changeKind ? { change_kind: changeKind } : {}),
          ...(changeNote ? { change_note: changeNote } : {}),
        },
      };
      await saveSubmission(updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        submissionKeys.detail(updated.meta.submission_id),
        updated,
      );
      qc.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });
}

// ─── Return submission ─────────────────────────────────────────────
export function useReturnSubmission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submission,
      comment,
    }: {
      submission: SubmissionPayload;
      comment: string;
    }) => {
      const updated: SubmissionPayload = {
        ...submission,
        meta: {
          ...submission.meta,
          status: 'RETURNED',
          return_comment: comment,
          locked: false,
          updated_at: new Date().toISOString(),
        },
      };
      await saveSubmission(updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        submissionKeys.detail(updated.meta.submission_id),
        updated,
      );
      qc.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });
}

// ─── Approve submission ────────────────────────────────────────────
export function useApproveSubmission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (submission: SubmissionPayload) => {
      const updated: SubmissionPayload = { ...submission };
      updated.meta = {
        ...updated.meta,
        status: 'APPROVED',
        locked: true,
        revision_number: updated.meta.revision_number ?? 1,
        updated_at: new Date().toISOString(),
      };

      // RULE 7: finalize draft events
      const finalizedEvents = (updated.rights_events || [])
        .filter((e) => !(e.origin === 'DRAFT' && e.draft_state === 'UNDONE'))
        .map((e) => {
          if (e.origin === 'DRAFT') {
            const { draft_state, ...rest } = e;
            return { ...rest, origin: 'APPROVED_BASELINE' as const };
          }
          return e;
        });
      updated.rights_events = finalizedEvents;

      // RULE 12: ensure full ISO timestamps on topology events
      updated.topology_events = (updated.topology_events || []).map((e) => ({
        ...e,
        ts: e.ts.includes('T')
          ? e.ts
          : new Date(e.ts + 'T00:00:00.000Z').toISOString(),
      }));

      // Compute final claims snapshot
      updated.claims_current = computeClaimsFromEvents(updated.rights_events);

      await saveSubmission(updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        submissionKeys.detail(updated.meta.submission_id),
        updated,
      );
      qc.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });
}

// ─── Delete submission ─────────────────────────────────────────────
export function useDeleteSubmission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFromStorage(id),
    onSuccess: (_result, id) => {
      qc.removeQueries({ queryKey: submissionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });
}

// ─── Create revision ───────────────────────────────────────────────
export function useCreateRevision() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      parentSubmission,
      changeKind,
      changeNote,
    }: {
      parentSubmission: SubmissionPayload;
      changeKind: ChangeKind;
      changeNote: string;
    }): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      if (parentSubmission.meta.status !== 'APPROVED') {
        throw new Error('Can only create revisions from approved submissions');
      }
      const revision = createRevisionFromApproved(
        parentSubmission,
        changeKind,
        changeNote,
        user.email,
      );
      await saveSubmission(revision);
      return revision.meta.submission_id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: submissionKeys.lists() });
    },
  });
}

// ─── Revision chain (derived, no mutation) ─────────────────────────
export function useRevisionChain(
  submissionId: string | undefined,
  allSubmissions: SubmissionPayload[],
) {
  if (!submissionId || allSubmissions.length === 0) return [];
  return findRevisionChain(submissionId, allSubmissions);
}
