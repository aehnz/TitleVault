// ============================================
// REGISTRAR DECISION BAR
// Bottom sticky decision bar with gating
// ============================================

import { 
  CheckCircle2, XCircle, RotateCcw, AlertTriangle, 
  ChevronDown, ChevronUp, Link as LinkIcon, Info 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { ChainAnchor, RegistrarDecision, RegistrarReason, RegistrarReasonCode, RegistrarRecord } from '@udhbha/types';


const REASON_CODES: { code: RegistrarReasonCode; label: string }[] = [
  { code: 'LEGAL_COMPLIANCE_ISSUE', label: 'Legal Compliance Issue' },
  { code: 'AUDIT_OVERRIDE_NOT_ACCEPTED', label: 'Audit Override Not Accepted' },
  { code: 'DOCUMENT_POLICY_VIOLATION', label: 'Document Policy Violation' },
  { code: 'JURISDICTION_MISMATCH', label: 'Jurisdiction Mismatch' },
  { code: 'FRAUD_SUSPECTED', label: 'Fraud Suspected' },
  { code: 'OTHER', label: 'Other' },
];

interface RegistrarDecisionBarProps {
  decision: RegistrarDecision | null;
  decisionGate: {
    canApprove: boolean;
    canReturn: boolean;
    canReject: boolean;
    approveBlockers: string[];
    returnBlockers: string[];
    rejectBlockers: string[];
  };
  reasons: RegistrarReason[];
  chainAnchor: ChainAnchor | null;
  onDecisionChange: (decision: RegistrarDecision | null) => void;
  onAddReason: (reason: RegistrarReason) => void;
  onRemoveReason: (code: string) => void;
  onSubmit: () => Promise<RegistrarRecord>;
  isSubmitting: boolean;
}

export function RegistrarDecisionBar({
  decision,
  decisionGate,
  reasons,
  chainAnchor,
  onDecisionChange,
  onAddReason,
  onRemoveReason,
  onSubmit,
  isSubmitting,
}: RegistrarDecisionBarProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [record, setRecord] = useState<RegistrarRecord | null>(null);
  const [reasonsOpen, setReasonsOpen] = useState(false);

  const handleSubmit = async () => {
    setConfirmOpen(false);
    try {
      const result = await onSubmit();
      setRecord(result);
      setResultOpen(true);
      toast.success(`Decision submitted: ${decision}`);
    } catch (error) {
      toast.error('Failed to submit decision');
    }
  };

  const handleReasonToggle = (code: RegistrarReasonCode, checked: boolean) => {
    if (checked) {
      onAddReason({
        code,
        severity: code === 'FRAUD_SUSPECTED' ? 'HIGH' : 'MEDIUM',
        message: REASON_CODES.find(r => r.code === code)?.label || code,
      });
    } else {
      onRemoveReason(code);
    }
  };

  const getSubmitBlockers = (): string[] => {
    if (!decision) return ['Select a decision'];
    switch (decision) {
      case 'APPROVED_FINAL': return decisionGate.approveBlockers;
      case 'RETURNED': return decisionGate.returnBlockers;
      case 'REJECTED_FINAL': return decisionGate.rejectBlockers;
    }
  };

  const canSubmit = () => {
    if (!decision) return false;
    switch (decision) {
      case 'APPROVED_FINAL': return decisionGate.canApprove;
      case 'RETURNED': return decisionGate.canReturn;
      case 'REJECTED_FINAL': return decisionGate.canReject;
    }
  };

  const DecisionButton = ({ 
    value, 
    label, 
    icon: Icon, 
    colorClass,
    blockers,
  }: { 
    value: RegistrarDecision; 
    label: string; 
    icon: React.ElementType;
    colorClass: string;
    blockers: string[];
  }) => {
    const isSelected = decision === value;
    const isBlocked = blockers.length > 0 && value !== 'RETURNED' && value !== 'REJECTED_FINAL';

    const button = (
      <Button
        variant={isSelected ? 'default' : 'outline'}
        className={cn(
          'gap-2',
          isSelected && colorClass
        )}
        onClick={() => onDecisionChange(isSelected ? null : value)}
        disabled={isBlocked}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Button>
    );

    if (isBlocked && blockers.length > 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <ul className="text-xs space-y-1">
              {blockers.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <>
      <div className="border-t bg-card p-4">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Reasons panel for RETURNED/REJECTED */}
          {(decision === 'RETURNED' || decision === 'REJECTED_FINAL') && (
            <Collapsible open={reasonsOpen} onOpenChange={setReasonsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Reasons ({reasons.length})
                  </span>
                  {reasonsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-3 mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {REASON_CODES.map(({ code, label }) => (
                      <div key={code} className="flex items-center gap-2">
                        <Checkbox
                          id={code}
                          checked={reasons.some(r => r.code === code)}
                          onCheckedChange={(checked) => handleReasonToggle(code, !!checked)}
                        />
                        <Label htmlFor={code} className="text-sm cursor-pointer">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Decision buttons and submit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Status indicators */}
              {chainAnchor && (
                <Badge variant="outline" className="gap-1 text-[hsl(var(--audit-pass))]">
                  <LinkIcon className="w-3 h-3" />
                  Anchored
                </Badge>
              )}
              {reasons.length > 0 && (
                <Badge variant="outline">
                  {reasons.length} Reason{reasons.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <DecisionButton
                value="APPROVED_FINAL"
                label="Approve + Anchor"
                icon={CheckCircle2}
                colorClass="bg-[hsl(var(--audit-pass))] hover:bg-[hsl(var(--audit-pass))]/90"
                blockers={decisionGate.approveBlockers}
              />
              <DecisionButton
                value="RETURNED"
                label="Return"
                icon={RotateCcw}
                colorClass="bg-[hsl(var(--audit-warn))] hover:bg-[hsl(var(--audit-warn))]/90 text-black"
                blockers={[]}
              />
              <DecisionButton
                value="REJECTED_FINAL"
                label="Reject"
                icon={XCircle}
                colorClass="bg-destructive hover:bg-destructive/90"
                blockers={[]}
              />

              <div className="w-px h-8 bg-border" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={() => setConfirmOpen(true)}
                      disabled={!canSubmit() || isSubmitting}
                      className="gap-2 min-w-32"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Decision'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canSubmit() && (
                  <TooltipContent side="top" className="max-w-xs">
                    <ul className="text-xs space-y-1">
                      {getSubmitBlockers().map((b, i) => (
                        <li key={i}>• {b}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Decision</DialogTitle>
            <DialogDescription>
              You are about to submit: <strong>{decision}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action will update the submission status and cannot be undone.
            </p>
            {chainAnchor && (
              <div className="mt-3 p-3 bg-[hsl(var(--audit-pass))]/10 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[hsl(var(--audit-pass))]" />
                  <span>Chain anchor will be recorded</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[hsl(var(--audit-pass))]" />
              Decision Submitted
            </DialogTitle>
            <DialogDescription>
              Record ID: {record?.record_id}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <pre className="json-viewer text-xs">
              {JSON.stringify(record, null, 2)}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => navigate('/registrar/inbox')}>
              Back to Inbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
