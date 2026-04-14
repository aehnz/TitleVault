import React, { forwardRef } from 'react';

import { SubmissionStatus } from '@udhbha/types';


interface StatusBadgeProps {
  status: SubmissionStatus;
  size?: 'sm' | 'md';
}

// Map submission status to our color system status
const mapStatus = (status: SubmissionStatus): StatusKind => {
  const mapping: Record<SubmissionStatus, StatusKind> = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    RETURNED: 'NEEDS_FIX',
    APPROVED: 'APPROVED',
  };
  return mapping[status] || 'DRAFT';
};

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, size = 'md' }, ref) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide";
    const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : '';
    
    const statusColor = defaultPreset.statusColors[mapStatus(status)];
    const isLight = status === 'DRAFT'; // DRAFT is grey, needs dark text

    return (
      <span 
        ref={ref} 
        className={cn(baseClasses, sizeClasses)}
        style={{ 
          backgroundColor: statusColor,
          color: isLight ? '#333333' : '#FFFFFF'
        }}
      >
        {status}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;