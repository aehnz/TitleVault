
import { AuditDecision, AuditReport, SubmissionStatus } from '@udhbha/types';


const API_BASE = 'http://localhost:5000/api';

export const AuditRepo = {
  /**
   * Save an audit decision and update submission status
   */
  async saveDecision(
    submissionId: string,
    auditReport: AuditReport,
    decision: AuditDecision
  ): Promise<void> {
    try {
      // Store the audit report
      await fetch(`${API_BASE}/audit-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditReport),
      });

      // Determine new status and lock state based on decision
      let newStatus: SubmissionStatus;
      let locked: boolean;

      switch (decision) {
        case 'PASS':
          newStatus = 'AUDIT_PASSED';
          locked = true;
          break;
        case 'RETURNED':
          newStatus = 'RETURNED';
          locked = false;
          break;
        case 'FAIL':
          newStatus = 'AUDIT_FAILED';
          locked = true;
          break;
        default:
          return;
      }

      // Update the submission status
      await SubmissionRepo.updateStatus(
        submissionId,
        newStatus,
        locked,
        decision === 'RETURNED' ? auditReport.notes.public : undefined
      );
    } catch (error) {
      console.error('Failed to save decision:', error);
      throw error;
    }
  },

  /**
   * Get audit report for a submission
   */
  async getBySubmissionId(submissionId: string): Promise<AuditReport | null> {
    try {
      const response = await fetch(`${API_BASE}/audit-reports/${submissionId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to get report:', error);
      return null;
    }
  },

  /**
   * Get all audit reports
   */
  async getAll(): Promise<AuditReport[]> {
    try {
      const response = await fetch(`${API_BASE}/audit-reports`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Failed to get all reports:', error);
      return [];
    }
  },

  /**
   * Clear all reports (for testing)
   */
  async clearAll(): Promise<void> {
    console.warn('clearAll not fully implemented for backend');
  },
};

