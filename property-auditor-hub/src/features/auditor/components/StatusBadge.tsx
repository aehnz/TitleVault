// ============================================
// STATUS BADGE COMPONENT
// Colored badges for different statuses
// ============================================

import { AuditDecision, ChangeKind, CheckStatus, DocReviewStatus, IssueSeverity, SubmissionStatus } from '@udhbha/types';


interface StatusBadgeProps {
  status: SubmissionStatus | CheckStatus | AuditDecision | DocReviewStatus;
  className?: string;
}

const statusStyles: Record<string, string> = {
  // Submission status
  DRAFT: 'bg-muted text-muted-foreground border-border',
  SUBMITTED: 'bg-info/10 text-info border-info/20',
  APPROVED: 'bg-success/10 text-success border-success/20',
  RETURNED: 'bg-warning/10 text-warning border-warning/20',
  AUDIT_PASSED: 'bg-success/10 text-success border-success/20',
  AUDIT_FAILED: 'bg-destructive/10 text-destructive border-destructive/20',
  
  // Check status
  PASS: 'bg-success/10 text-success border-success/20',
  FAIL: 'bg-destructive/10 text-destructive border-destructive/20',
  WARN: 'bg-warning/10 text-warning border-warning/20',
  
  // Doc review status
  PENDING: 'bg-muted text-muted-foreground border-border',
  VALID: 'bg-success/10 text-success border-success/20',
  MISSING: 'bg-destructive/10 text-destructive border-destructive/20',
  ILLEGIBLE: 'bg-warning/10 text-warning border-warning/20',
  MISMATCH: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
  AUDIT_PASSED: 'Audit Passed',
  AUDIT_FAILED: 'Audit Failed',
  PASS: 'Pass',
  FAIL: 'Fail',
  WARN: 'Warning',
  PENDING: 'Pending',
  VALID: 'Valid',
  MISSING: 'Missing',
  ILLEGIBLE: 'Illegible',
  MISMATCH: 'Mismatch',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        statusStyles[status] || statusStyles.PENDING,
        className
      )}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}

interface ChangeKindBadgeProps {
  kind: ChangeKind;
  className?: string;
}

const changeKindStyles: Record<ChangeKind, string> = {
  BASELINE: 'bg-primary/10 text-primary border-primary/20',
  TOPOLOGY_ONLY: 'bg-accent text-accent-foreground border-accent',
  RIGHTS_ONLY: 'bg-accent text-accent-foreground border-accent',
  TOPOLOGY_AND_RIGHTS: 'bg-info/10 text-info border-info/20',
  DOCUMENT_UPDATE: 'bg-muted text-muted-foreground border-border',
  AUTO: 'bg-muted text-muted-foreground border-border',
};

const changeKindLabels: Record<ChangeKind, string> = {
  BASELINE: 'Baseline',
  TOPOLOGY_ONLY: 'Topology Only',
  RIGHTS_ONLY: 'Rights Only',
  TOPOLOGY_AND_RIGHTS: 'Topology + Rights',
  DOCUMENT_UPDATE: 'Document Update',
  AUTO: 'Auto-detect',
};

export function ChangeKindBadge({ kind, className }: ChangeKindBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        changeKindStyles[kind],
        className
      )}
    >
      {changeKindLabels[kind]}
    </Badge>
  );
}

interface SeverityBadgeProps {
  severity: IssueSeverity;
  className?: string;
}

const severityStyles: Record<IssueSeverity, string> = {
  HIGH: 'bg-destructive/10 text-destructive border-destructive/20',
  MEDIUM: 'bg-warning/10 text-warning border-warning/20',
  LOW: 'bg-info/10 text-info border-info/20',
  INFO: 'bg-muted text-muted-foreground border-border',
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        severityStyles[severity],
        className
      )}
    >
      {severity}
    </Badge>
  );
}
