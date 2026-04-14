// ============================================
// REGISTRAR SUMMARY PANEL
// Right sidebar summary for review page
// ============================================

import { Separator } from '@/components/ui/separator';

import { AuditReport, RegistrarState, Submission } from '@udhbha/types';


interface RegistrarSummaryPanelProps {
  submission: Submission;
  auditReport: AuditReport;
  registrarState: RegistrarState;
}

export function RegistrarSummaryPanel({ 
  submission, 
  auditReport, 
  registrarState 
}: RegistrarSummaryPanelProps) {
  const statusIcon = () => {
    if (auditReport.decision === 'PASS') {
      return <CheckCircle2 className="w-5 h-5 text-[hsl(var(--audit-pass))]" />;
    }
    if (auditReport.decision === 'FAIL') {
      return <XCircle className="w-5 h-5 text-destructive" />;
    }
    return <AlertTriangle className="w-5 h-5 text-[hsl(var(--audit-warn))]" />;
  };

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {statusIcon()}
            Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Submission</span>
            <Badge className={
              submission.meta.status === 'AUDIT_PASSED' ? 'status-pass' :
              submission.meta.status === 'APPROVED' ? 'status-approved' :
              'status-pending'
            }>
              {submission.meta.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Audit Decision</span>
            <Badge className={auditReport.decision === 'PASS' ? 'status-pass' : 'status-fail'}>
              {auditReport.decision}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Anchored</span>
            {registrarState.chain_anchor ? (
              <Badge variant="outline" className="gap-1 text-[hsl(var(--audit-pass))]">
                <LinkIcon className="w-3 h-3" />
                Yes
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">No</Badge>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hashes</span>
            {registrarState.hashes ? (
              <Badge variant="outline" className="gap-1 text-[hsl(var(--audit-pass))]">
                <CheckCircle2 className="w-3 h-3" />
                Computed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Not Computed</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Audit Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auditor</span>
            <span>{auditReport.auditor_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Audited</span>
            <span>{format(new Date(auditReport.audited_at), 'MMM d, HH:mm')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Change Kind</span>
            <Badge variant="secondary">{auditReport.change_kind_detected}</Badge>
          </div>
          <Separator className="my-2" />
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-lg font-semibold">{auditReport.summary.topology_events}</div>
              <div className="text-xs text-muted-foreground">Topology</div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-lg font-semibold">{auditReport.summary.rights_events}</div>
              <div className="text-xs text-muted-foreground">Rights</div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-lg font-semibold">{auditReport.summary.docs_required}</div>
              <div className="text-xs text-muted-foreground">Docs Req</div>
            </div>
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-lg font-semibold">{auditReport.summary.checks_failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues from Audit */}
      {auditReport.reasons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[hsl(var(--audit-warn))]" />
              Audit Issues ({auditReport.reasons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditReport.reasons.map((reason, i) => (
                <div key={i} className="p-2 bg-muted/50 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={reason.severity === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {reason.severity}
                    </Badge>
                    <span className="font-mono">{reason.code}</span>
                  </div>
                  <p className="text-muted-foreground mt-1">{reason.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
