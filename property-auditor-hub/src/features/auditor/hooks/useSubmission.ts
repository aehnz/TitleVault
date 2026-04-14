// ============================================
// USE SUBMISSION HOOK
// Fetches submission and parent data
// ============================================

import { useState, useEffect } from 'react';

import { Submission } from '@udhbha/types';


interface UseSubmissionResult {
  submission: Submission | null;
  parent: Submission | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubmission(submissionId: string): UseSubmissionResult {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [parent, setParent] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sub = await SubmissionRepo.getById(submissionId);
      
      if (!sub) {
        setError(`Submission ${submissionId} not found`);
        return;
      }

      setSubmission(sub);

      // Fetch parent if exists
      if (sub.meta.parent_submission_id) {
        const parentSub = await SubmissionRepo.getParent(sub);
        setParent(parentSub);
      } else {
        setParent(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submission');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [submissionId]);

  return {
    submission,
    parent,
    isLoading,
    error,
    refetch: fetchData,
  };
}
