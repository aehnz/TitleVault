/**
 * Phase 5.5: Real-time notifications via Server-Sent Events.
 * Automatically reconnects on disconnect.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { submissionKeys } from './useSubmissions';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export function useStatusNotifications() {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // EventSource doesn't support custom headers, so pass token as query param
    const url = `${API_BASE}/events/stream?token=${encodeURIComponent(token)}`;

    const connect = () => {
      const source = new EventSource(url);
      sourceRef.current = source;

      source.addEventListener('STATUS_CHANGE', (event) => {
        try {
          const data = JSON.parse(event.data);
          toast.info(data.message, {
            description: `Submission ${data.submission_id}`,
            duration: 5000,
          });

          // Invalidate the submissions list so it refetches
          queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });

          // Also invalidate the specific submission if cached
          if (data.submission_id) {
            queryClient.invalidateQueries({
              queryKey: submissionKeys.detail(data.submission_id),
            });
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      });

      source.addEventListener('NEW_SUBMISSION', (event) => {
        try {
          const data = JSON.parse(event.data);
          toast.info(data.message, { duration: 4000 });
          queryClient.invalidateQueries({ queryKey: submissionKeys.lists() });
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      });

      source.onerror = () => {
        source.close();
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      sourceRef.current?.close();
    };
  }, [queryClient]);
}
