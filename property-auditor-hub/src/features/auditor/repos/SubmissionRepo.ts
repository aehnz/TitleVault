import { InboxItem, Submission } from '@udhbha/types';



const API_BASE = 'http://localhost:5000/api';

export const SubmissionRepo = {
  /**
   * Get all submissions in the audit queue
   */
  async getQueue(): Promise<InboxItem[]> {
    try {
      const response = await fetch(`${API_BASE}/submissions`);
      if (!response.ok) return [];

      const submissions: Submission[] = await response.json();

      return submissions
        .filter((s) => s.meta.status === 'SUBMITTED')
        .map((s): InboxItem => ({
          submission_id: s.meta.submission_id,
          parcel_id: s.parcel.parcel_id,
          parcel_name: s.parcel.name,
          status: s.meta.status,
          change_kind: s.meta.change_kind,
          submitted_by: s.meta.created_by,
          submitted_at: s.meta.created_at,
          revision_number: s.meta.revision_number,
          event_counts: {
            topology: s.topology_events.length,
            rights: s.rights_events.length,
          },
        }));
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  },

  /**
   * Get submissions by status (for registrar inbox)
   */
  async listByStatus(statuses: string[]): Promise<Submission[]> {
    try {
      const response = await fetch(`${API_BASE}/submissions`);
      if (!response.ok) return [];

      const submissions: Submission[] = await response.json();
      return submissions.filter(s => statuses.includes(s.meta.status));
    } catch (error) {
      console.error('Failed to list by status:', error);
      return [];
    }
  },

  /**
   * Get a submission by ID
   */
  async getById(id: string): Promise<Submission | null> {
    try {
      const response = await fetch(`${API_BASE}/submissions/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to get by id:', error);
      return null;
    }
  },

  /**
   * Get the parent submission of a revision
   */
  async getParent(submission: Submission): Promise<Submission | null> {
    if (!submission.meta.parent_submission_id) {
      return null;
    }
    return this.getById(submission.meta.parent_submission_id);
  },

  /**
   * Update a submission's status and lock state
   */
  async updateStatus(
    submissionId: string,
    status: Submission['meta']['status'],
    locked: boolean,
    returnComment?: string
  ): Promise<void> {
    try {
      const submission = await this.getById(submissionId);
      if (!submission) throw new Error('Submission not found');

      submission.meta.status = status;
      submission.meta.locked = locked;
      submission.meta.updated_at = new Date().toISOString();

      if (returnComment !== undefined) {
        (submission.meta as any).return_comment = returnComment;
      }

      await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error;
    }
  },

  /**
   * Reset demo data (No-op or could trigger backend reset if implemented)
   */
  async resetDemo(): Promise<void> {
    console.warn('resetDemo not fully implemented for backend');
  },
};

