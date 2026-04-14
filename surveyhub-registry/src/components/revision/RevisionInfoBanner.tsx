import React from 'react';

import { SubmissionPayload } from '@udhbha/types';


interface RevisionInfoBannerProps {
  submission: SubmissionPayload;
  onCreateRevision?: () => void;
  showCreateButton?: boolean;
}

const RevisionInfoBanner: React.FC<RevisionInfoBannerProps> = ({
  submission,
  onCreateRevision,
  showCreateButton = true,
}) => {
  const navigate = useNavigate();
  const isLocked = isSubmissionLocked(submission);
  const hasParent = !!submission.meta.parent_submission_id;
  const revisionNumber = submission.meta.revision_number ?? 1;

  // Show locked banner for approved/submitted submissions
  if (isLocked && !hasParent) {
    return (
      <div className="bg-muted/50 border-b border-[hsl(var(--panel-border))] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              This record is <strong>{submission.meta.status.toLowerCase()}</strong> and cannot be edited directly.
            </span>
            {revisionNumber > 1 && (
              <Badge variant="outline" className="font-mono text-xs">
                Revision #{revisionNumber}
              </Badge>
            )}
          </div>
          {showCreateButton && submission.meta.status === 'APPROVED' && onCreateRevision && (
            <Button size="sm" variant="outline" onClick={onCreateRevision}>
              <GitBranch className="w-4 h-4 mr-1" />
              Create Revision
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show returned banner for rejected submissions
  if (submission.meta.status === 'RETURNED') {
    return (
      <div className="bg-destructive/5 border-b border-destructive/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-4 h-4 text-destructive" />
          <div className="flex-1">
            <span className="text-sm font-bold text-destructive uppercase tracking-wide">
              Submission Returned for Revision
            </span>
            {submission.meta.return_comment && (
              <p className="text-sm text-foreground mt-1">
                <strong>Auditor Remark:</strong> {submission.meta.return_comment}
              </p>
            )}
          </div>
          <Badge variant="destructive" className="animate-pulse">Action Required</Badge>
        </div>
      </div>
    );
  }

  // Show revision context banner for draft revisions
  if (hasParent) {
    return (
      <div className="bg-primary/5 border-b border-primary/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="text-sm">
              <strong>Revision #{revisionNumber}</strong> of{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                {submission.meta.parent_submission_id}
              </code>
            </span>
            {submission.meta.change_kind && (
              <Badge variant="secondary" className="text-xs">
                {submission.meta.change_kind.replace('_', ' ')}
              </Badge>
            )}
            {isLocked && (
              <Badge variant="outline" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/app/viewer/${submission.meta.parent_submission_id}`)}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View Parent
          </Button>
        </div>
        {submission.meta.change_note && (
          <p className="text-xs text-muted-foreground mt-2 pl-7">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            {submission.meta.change_note}
          </p>
        )}
      </div>
    );
  }

  return null;
};

export default RevisionInfoBanner;
