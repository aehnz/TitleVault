import React from 'react';

import { GitBranch, Clock, Check, Send, RotateCcw, FileEdit, ExternalLink } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import { SubmissionPayload } from '@udhbha/types';


interface RevisionHistoryPanelProps {
  currentSubmission: SubmissionPayload;
  allSubmissions: SubmissionPayload[];
  onClose?: () => void;
}

const RevisionHistoryPanel: React.FC<RevisionHistoryPanelProps> = ({
  currentSubmission,
  allSubmissions,
  onClose,
}) => {
  const navigate = useNavigate();
  const revisionChain = findRevisionChain(currentSubmission.meta.submission_id, allSubmissions);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Check className="w-3.5 h-3.5 text-green-600" />;
      case 'SUBMITTED':
        return <Send className="w-3.5 h-3.5 text-blue-600" />;
      case 'RETURNED':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <FileEdit className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const handleNavigate = (sub: SubmissionPayload) => {
    const path = sub.meta.status === 'APPROVED' || sub.meta.status === 'SUBMITTED'
      ? `/app/viewer/${sub.meta.submission_id}`
      : `/app/editor/${sub.meta.submission_id}`;
    navigate(path);
    onClose?.();
  };

  if (revisionChain.length <= 1) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Revision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            This is the original submission. No revisions yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Revision History ({revisionChain.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-80">
          <div className="p-4 pt-0 space-y-0">
            {revisionChain.map((sub, index) => {
              const isFirst = index === 0;
              const isLast = index === revisionChain.length - 1;
              const isCurrent = sub.meta.submission_id === currentSubmission.meta.submission_id;

              return (
                <div key={sub.meta.submission_id} className="relative">
                  {/* Timeline connector */}
                  {!isLast && (
                    <div className="absolute left-[11px] top-8 w-0.5 h-[calc(100%-16px)] bg-border" />
                  )}

                  <div 
                    className={cn(
                      "flex items-start gap-3 py-3 cursor-pointer rounded-lg transition-colors hover:bg-accent/50 -mx-2 px-2",
                      isCurrent && "bg-accent/30"
                    )}
                    onClick={() => handleNavigate(sub)}
                  >
                    {/* Timeline dot */}
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      isFirst ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {isFirst ? (
                        <span className="text-xs font-bold">1</span>
                      ) : (
                        <span className="text-xs font-medium">{sub.meta.revision_number ?? index + 1}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusIcon(sub.meta.status)}
                        <StatusBadge status={sub.meta.status} size="sm" />
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>

                      <p className="font-mono text-xs text-muted-foreground mt-1 truncate">
                        {sub.meta.submission_id}
                      </p>

                      {sub.meta.change_kind && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {sub.meta.change_kind.replace('_', ' ')}
                        </Badge>
                      )}

                      {sub.meta.change_note && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {sub.meta.change_note}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {sub.meta.updated_at 
                          ? new Date(sub.meta.updated_at).toLocaleString() 
                          : 'Unknown date'}
                      </div>
                    </div>

                    {/* View button */}
                    <Button size="sm" variant="ghost" className="flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RevisionHistoryPanel;
