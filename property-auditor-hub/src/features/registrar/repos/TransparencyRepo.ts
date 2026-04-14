import { TransparencyBundle } from '@udhbha/types';



const API_BASE = 'http://localhost:5000/api';

export const TransparencyRepo = {
  /**
   * Save a transparency bundle
   */
  async saveBundle(submissionId: string, bundle: TransparencyBundle): Promise<void> {
    try {
      await fetch(`${API_BASE}/transparency-bundles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle), // backend expects the whole bundle which contains submission_id
      });
    } catch (error) {
      console.error('Failed to save bundle:', error);
      throw error;
    }
  },

  /**
   * Get transparency bundle for a submission
   */
  async getBySubmissionId(submissionId: string): Promise<TransparencyBundle | null> {
    try {
      const response = await fetch(`${API_BASE}/transparency-bundles/${submissionId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Failed to get bundle:', error);
      return null;
    }
  },

  /**
   * Get all transparency bundles (Note: Backend might need a list endpoint if needed)
   */
  async getAll(): Promise<TransparencyBundle[]> {
    console.warn('getAll not fully implemented for transparency bundles on backend');
    return [];
  },

  /**
   * Clear all bundles (for testing)
   */
  async clearAll(): Promise<void> {
    console.warn('clearAll not fully implemented for backend');
  },
};

