// ============================================
// SUMMARY PANEL COMPONENT
// Right side sticky panel for audit summary
// ============================================

import { 
  FileText, 
  GitBranch, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  Layers,
  Users,
  FileCheck
} from 'lucide-react';
import { 
  StatusBadge, 
  ChangeKindBadge, 
  SeverityBadge 
} from './StatusBadge';

import { AuditReason, ChangeKind, DocumentCheckResults, GeometryCheckResults, RightsCheckResults, Submission } from '@udhbha/types';


interface SummaryPanelProps {
  submission: Submission;
  parent: Submission | null;
  detectedChangeKind: ChangeKind;
  reasons: AuditReason[];
  geometryResults: GeometryCheckResults | null;
  rightsResults: RightsCheckResults | null;
  docResults?: DocumentCheckResults | null;
  docCount: number;
  checksRun?: {
    geometry: boolean;
    rights: boolean;
    docs: boolean;
  };
}

export function SummaryPanel({
  submission,
  parent,
  detectedChangeKind,
  reasons,
  geometryResults,
  rightsResults,
  docResults,
  docCount,
  checksRun,
}: SummaryPanelProps) {
  const meta = submission.meta;
  const changeKindMismatch = meta.change_kind !== 'AUTO' && meta.change_kind !== detectedChangeKind;

  const getCheckBadge = (results: { status: string } | null, run: boolean) => {
    if (!run) {
      return <Badge variant="outline" className="text-xs">Not Run</Badge>;
    }
    const status = results?.status || 'PASS';
    return <StatusBadge status={status as any} />;
  };

  return (
    <div className="sticky top-4 space-y-4">
      {/* Submission Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Submission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{meta.submission_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={meta.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revision</span>
              <span>#{meta.revision_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change Kind</span>
              <ChangeKindBadge kind={meta.change_kind} />
            </div>
            {changeKindMismatch && (
              <div className="flex items-center gap-2 p-2 bg-[hsl(var(--warning-bg))] border border-[hsl(var(--warning-border))] rounded-md text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[hsl(var(--audit-warn))]" />
                <span>Detected: {detectedChangeKind}</span>
              </div>
            )}
          </div>

          {parent && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Parent</span>
                <div className="text-xs font-mono">{parent.meta.submission_id}</div>
                <StatusBadge status={parent.meta.status} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Event Counts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-md">
              <div className="text-lg font-semibold">
                {submission.topology_events.length}
              </div>
              <div className="text-xs text-muted-foreground">Topology</div>
            </div>
            <div className="p-2 bg-muted/50 rounded-md">
              <div className="text-lg font-semibold">
                {submission.rights_events.filter(e => e.draft_state !== 'UNDONE').length}
              </div>
              <div className="text-xs text-muted-foreground">Rights</div>
            </div>
            <div className="p-2 bg-muted/50 rounded-md">
              <div className="text-lg font-semibold">{docCount}</div>
              <div className="text-xs text-muted-foreground">Docs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className={cn(
              "flex items-center justify-between p-2 rounded-md border",
              checksRun?.geometry 
                ? (geometryResults?.status === 'PASS' ? 'check-passed' : geometryResults?.status === 'FAIL' ? 'check-failed' : 'check-warning')
                : 'bg-muted/50'
            )}>
              <span className="text-sm">Geometry</span>
              {getCheckBadge(geometryResults, checksRun?.geometry || false)}
            </div>
            <div className={cn(
              "flex items-center justify-between p-2 rounded-md border",
              checksRun?.rights 
                ? (rightsResults?.status === 'PASS' ? 'check-passed' : rightsResults?.status === 'FAIL' ? 'check-failed' : 'check-warning')
                : 'bg-muted/50'
            )}>
              <span className="text-sm">Rights</span>
              {getCheckBadge(rightsResults, checksRun?.rights || false)}
            </div>
            <div className={cn(
              "flex items-center justify-between p-2 rounded-md border",
              checksRun?.docs 
                ? (docResults?.status === 'PASS' ? 'check-passed' : docResults?.status === 'FAIL' ? 'check-failed' : 'check-warning')
                : 'bg-muted/50'
            )}>
              <span className="text-sm">Documents</span>
              {getCheckBadge(docResults || null, checksRun?.docs || false)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      {reasons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Issues ({reasons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {reasons.map((reason, i) => (
                  <div
                    key={`${reason.code}-${reason.entity.id}-${i}`}
                    className="flex items-start gap-2 p-2 bg-muted/50 rounded-md text-sm"
                  >
                    {reason.severity === 'HIGH' ? (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[hsl(var(--audit-warn))] flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{reason.code}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {reason.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
