
import { RegistrarDecision, RegistrarRecord } from '@udhbha/types';


const API_BASE = 'http://localhost:5000/api';

export const RegistrarRepo = {
  /**
   * Save a registrar record and update submission status
   */
  async saveRecord(record: RegistrarRecord): Promise<void> {
    try {
      // Store the registrar record
      await fetch(`${API_BASE}/registrar-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });

      // Generate blockchain anchor if decision is APPROVED_FINAL
      if (record.decision === 'APPROVED_FINAL') {
        try {
          // Get the transparency bundle for this submission
          const bundleResponse = await fetch(`${API_BASE}/transparency-bundles/${record.submission_id}`);
          if (bundleResponse.ok) {
            const bundleData = await bundleResponse.json();

            // Anchor to blockchain
            const anchorResponse = await fetch(`${API_BASE}/blockchain/anchor`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bundle_data: bundleData,
                submission_id: record.submission_id
              }),
            });

            if (anchorResponse.ok) {
              const chainAnchor = await anchorResponse.json();

              // Update the record with chain anchor
              record.chain_anchor = chainAnchor;

              // Save updated record
              await fetch(`${API_BASE}/registrar-records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record),
              });
            }
          }
        } catch (anchorError) {
          console.warn('Failed to anchor to blockchain:', anchorError);
          // Continue anyway - record is saved
        }
      }

      // Determine new status and lock state based on decision
      let newStatus: 'APPROVED' | 'RETURNED' | 'AUDIT_FAILED';
      let locked: boolean;
      let returnComment: string | undefined;

      switch (record.decision) {
        case 'APPROVED_FINAL':
          newStatus = 'APPROVED';
          locked = true;
          break;
        case 'RETURNED':
          newStatus = 'RETURNED';
          locked = false;
          returnComment = record.notes?.public || 'Returned for revision';
          break;
        case 'REJECTED_FINAL':
          newStatus = 'AUDIT_FAILED';
          locked = true;
          break;
        default:
          return;
      }

      // Update the submission status
      await SubmissionRepo.updateStatus(record.submission_id, newStatus, locked, returnComment);
    } catch (error) {
      console.error('Failed to save record:', error);
      throw error;
    }
  },

  /**
   * Get registrar record for a submission
   */
  async getBySubmissionId(submissionId: string): Promise<RegistrarRecord | null> {
    try {
      const response = await fetch(`${API_BASE}/registrar-records/${submissionId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to get record:', error);
      return null;
    }
  },

  /**
   * Get all registrar records
   */
  async getAll(): Promise<RegistrarRecord[]> {
    try {
      const response = await fetch(`${API_BASE}/registrar-records`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Failed to get all records:', error);
      return [];
    }
  },

  /**
   * Check if a submission has been processed by registrar
   */
  async hasRecord(submissionId: string): Promise<boolean> {
    const record = await this.getBySubmissionId(submissionId);
    return record !== null;
  },

  /**
   * Clear all records (for testing)
   */
  async clearAll(): Promise<void> {
    console.warn('clearAll not fully implemented for backend');
  },
};

