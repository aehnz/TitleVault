// ============================================
// DECISION BAR COMPONENT
// Sticky bottom bar for audit decision with validation gating
// Uses centralized computeDecisionGate logic
// ============================================

import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  AlertTriangle,
  Shield,
  Copy,
  Check,
  AlertCircle,
  Bug,
  ChevronDown
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { AuditDecision, AuditReason, AuditReport } from '@udhbha/types';


interface DecisionBarProps {
  decision: AuditDecision | null;
  decisionGate: DecisionGateOutputs;
  overrideEnabled: boolean;
  reasonCount: number;
  reasons: AuditReason[];
  onDecisionChange: (decision: AuditDecision | null) => void;
  onToggleOverride: () => void;
  onSubmit: () => Promise<AuditReport | undefined>;
  isSubmitting: boolean;
  showDebug?: boolean;
}

export function DecisionBar({
  decision,
  decisionGate,
  overrideEnabled,
  reasonCount,
  reasons,
  onDecisionChange,
  onToggleOverride,
  onSubmit,
  isSubmitting,
  showDebug = false,
}: DecisionBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<AuditReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [reasonsOpen, setReasonsOpen] = useState(false);

  const handleSubmit = async () => {
    setShowConfirm(false);
    const report = await onSubmit();
    if (report) {
      setGeneratedReport(report);
      setShowReport(true);
      toast.success('Audit decision saved successfully');
    }
  };

  const copyReport = () => {
    if (generatedReport) {
      navigator.clipboard.writeText(JSON.stringify(generatedReport, null, 2));
      setCopied(true);
      toast.success('Audit report copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get submit validation based on current decision
  const getSubmitValidation = (): { valid: boolean; blockers: string[] } => {
    if (!decision) {
      return { valid: false, blockers: ['Select a decision first'] };
    }
    
    switch (decision) {
      case 'PASS':
        return {
          valid: decisionGate.canSubmitPass,
          blockers: [...decisionGate.passBlockers, ...decisionGate.passSubmitBlockers],
        };
      case 'RETURNED':
        return {
          valid: decisionGate.canSubmitReturn,
          blockers: [...decisionGate.returnBlockers, ...decisionGate.returnSubmitBlockers],
        };
      case 'FAIL':
        return {
          valid: decisionGate.canSubmitFail,
          blockers: [...decisionGate.failBlockers, ...decisionGate.failSubmitBlockers],
        };
      default:
        return { valid: false, blockers: ['Unknown decision'] };
    }
  };

  const validation = getSubmitValidation();
  const { checksComplete, hardFail, warnings } = decisionGate.debug;

  const DecisionButton = ({ 
    type, 
    icon: Icon, 
    label, 
    colorClass,
    canOpen,
    blockers,
  }: { 
    type: AuditDecision; 
    icon: any; 
    label: string; 
    colorClass: string;
    canOpen: boolean;
    blockers: string[];
  }) => {
    const isSelected = decision === type;
    const isDisabled = !canOpen && !isSelected;
    
    const button = (
      <Button
        variant={isSelected ? 'default' : 'outline'}
        size="sm"
        onClick={() => onDecisionChange(isSelected ? null : type)}
        disabled={isDisabled}
        className={cn(
          'gap-2',
          isSelected && colorClass
        )}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Button>
    );

    if (isDisabled && blockers.length > 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{button}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <ul className="list-disc pl-4 space-y-1">
              {blockers.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <>
      <div className="decision-bar">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            {/* Check status indicator */}
            <div className="flex items-center gap-3">
              {!checksComplete && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--warning-bg))] border border-[hsl(var(--warning-border))] rounded text-sm">
                  <AlertCircle className="w-4 h-4 text-[hsl(var(--audit-warn))]" />
                  <span>Run all checks first</span>
                </div>
              )}
              
              {checksComplete && !hardFail && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--audit-pass))]/10 border border-[hsl(var(--audit-pass))]/30 rounded text-sm text-[hsl(var(--audit-pass))]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All checks complete</span>
                </div>
              )}

              {checksComplete && hardFail && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--audit-fail))]/10 border border-[hsl(var(--audit-fail))]/30 rounded text-sm text-[hsl(var(--audit-fail))]">
                  <XCircle className="w-4 h-4" />
                  <span>Hard failures detected</span>
                </div>
              )}

              {checksComplete && warnings && !hardFail && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--audit-warn))]/10 border border-[hsl(var(--audit-warn))]/30 rounded text-sm text-[hsl(var(--audit-warn))]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Warnings present</span>
                </div>
              )}
            </div>

            {/* Decision buttons */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground mr-2">
                Decision:
              </span>
              
              <DecisionButton 
                type="PASS" 
                icon={CheckCircle2} 
                label="Pass" 
                colorClass="bg-[hsl(var(--audit-pass))] hover:bg-[hsl(var(--audit-pass))]/90 text-white"
                canOpen={decisionGate.canOpenPass}
                blockers={decisionGate.passBlockers}
              />
              <DecisionButton 
                type="RETURNED" 
                icon={RotateCcw} 
                label="Return" 
                colorClass="bg-[hsl(var(--audit-warn))] hover:bg-[hsl(var(--audit-warn))]/90 text-black"
                canOpen={decisionGate.canOpenReturn}
                blockers={decisionGate.returnBlockers}
              />
              <DecisionButton 
                type="FAIL" 
                icon={XCircle} 
                label="Fail" 
                colorClass="bg-[hsl(var(--audit-fail))] hover:bg-[hsl(var(--audit-fail))]/90 text-white"
                canOpen={decisionGate.canOpenFail}
                blockers={decisionGate.failBlockers}
              />
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-4">
              {reasonCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  {reasonCount} reason{reasonCount !== 1 ? 's' : ''}
                </Badge>
              )}

              {hardFail && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[hsl(var(--audit-warn))]" />
                  <span className="text-sm text-[hsl(var(--audit-warn))]">Hard failures</span>
                  
                  {decision === 'PASS' && (
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                      <Switch
                        id="override"
                        checked={overrideEnabled}
                        onCheckedChange={onToggleOverride}
                      />
                      <Label htmlFor="override" className="text-sm cursor-pointer">
                        Override
                      </Label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit button */}
            <div className="flex items-center gap-3">
              {!validation.valid && decision && validation.blockers.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground max-w-[200px] text-right truncate cursor-help">
                      {validation.blockers[0]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <ul className="list-disc pl-4 space-y-1">
                      {validation.blockers.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
              
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={!validation.valid || isSubmitting}
                className="gap-2 toolbar-btn primary"
              >
                <Shield className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Audit'}
              </Button>
            </div>
          </div>

          {/* Reasons Panel - shows when RETURN or FAIL is selected */}
          {(decision === 'RETURNED' || decision === 'FAIL') && (
            <Collapsible open={reasonsOpen} onOpenChange={setReasonsOpen} className="mt-3">
              <CollapsibleTrigger className="flex items-center gap-2 text-xs hover:text-foreground">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-medium">
                  Reasons ({reasonCount}) — {reasonCount === 0 ? 'None detected yet' : 'Auto-detected from checks/reviews'}
                </span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", reasonsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="p-3 bg-muted/50 rounded-lg">
                  {reasons.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No reasons detected. Mark documents as MISSING/ILLEGIBLE/MISMATCH or run checks to detect issues.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {reasons.map((r, i) => (
                        <div key={`${r.code}-${r.entity.id}-${i}`} className="flex items-center gap-2 text-xs">
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            {r.code}
                          </Badge>
                          <span className="text-muted-foreground truncate flex-1">{r.message}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {r.entity.level}:{r.entity.id.slice(-8)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Debug Panel */}
          {showDebug && (
            <Collapsible open={debugOpen} onOpenChange={setDebugOpen} className="mt-3">
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                <Bug className="w-3 h-3" />
                <span>Decision Debug</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", debugOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="p-3 bg-muted/50 rounded-lg text-xs font-mono grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-muted-foreground mb-1">Status</div>
                    <div>checksComplete: <span className={checksComplete ? 'text-green-500' : 'text-red-500'}>{String(checksComplete)}</span></div>
                    <div>hardFail: <span className={hardFail ? 'text-red-500' : 'text-green-500'}>{String(hardFail)}</span></div>
                    <div>warnings: <span className={warnings ? 'text-yellow-500' : 'text-green-500'}>{String(warnings)}</span></div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Docs</div>
                    <div>reqDocFailures: {decisionGate.debug.requiredDocFailures}</div>
                    <div>reqDocPending: {decisionGate.debug.requiredDocPending}</div>
                    <div>reasonCount: {reasonCount}</div>
                    <div>overrideEnabled: {String(overrideEnabled)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Open Gate</div>
                    <div>canOpenPass: <span className={decisionGate.canOpenPass ? 'text-green-500' : 'text-red-500'}>{String(decisionGate.canOpenPass)}</span></div>
                    <div>canOpenReturn: <span className={decisionGate.canOpenReturn ? 'text-green-500' : 'text-red-500'}>{String(decisionGate.canOpenReturn)}</span></div>
                    <div>canOpenFail: <span className={decisionGate.canOpenFail ? 'text-green-500' : 'text-red-500'}>{String(decisionGate.canOpenFail)}</span></div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Submit Gate</div>
                    <div>canSubmitPass: <span className={decisionGate.canSubmitPass ? 'text-green-500' : 'text-red-500'}>{String(decisionGate.canSubmitPass)}</span></div>
                    <div>canSubmitReturn: <span className={decisionGate.canSubmitReturn ? 'text-green-500' : 'text-red-500'}>{String(decisionGate.canSubmitReturn)}</span></div>
                    <div>canSubmitFail: <span className={decisionGate.canSubmitFail ? 'text-green-500' : 'text-red-500'}>{String(decisionGate.canSubmitFail)}</span></div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Audit Decision</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to submit your audit decision as{' '}
              <strong className={cn(
                decision === 'PASS' && 'text-[hsl(var(--audit-pass))]',
                decision === 'RETURNED' && 'text-[hsl(var(--audit-warn))]',
                decision === 'FAIL' && 'text-[hsl(var(--audit-fail))]'
              )}>
                {decision}
              </strong>
              . This action cannot be undone.
              {overrideEnabled && decision === 'PASS' && (
                <span className="block mt-2 text-[hsl(var(--audit-warn))]">
                  ⚠️ You are overriding hard failures.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--audit-pass))]" />
              Audit Report Generated
            </DialogTitle>
            <DialogDescription>
              Your audit decision has been saved. The submission status has been updated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={copyReport}
                className="absolute top-2 right-2 gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
              <pre className="json-viewer max-h-[400px]">
                {generatedReport && JSON.stringify(generatedReport, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => window.location.href = '/auditor/inbox'}>
              Back to Inbox
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
