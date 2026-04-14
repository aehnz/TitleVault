import React, { useState, useMemo } from 'react';

import {
  computeClaimsFromEvents,
  computeBaselineClaims,
  createRightsEvent,
  undoEvent,
  restoreEvent,
  getDraftEvents,
  getBaselineEvents,
  getClaimStatusColor,
  formatTarget,
  getClaimCounts,
  canModifyDraftEvents,
  getActiveDraftCount,
  getUndoneDraftCount,
} from '@/lib/rightsEngine';
import {
  Plus,
  Gavel,
  History,
  AlertTriangle,
  ArrowRightLeft,
  FileX,
  DoorOpen,
  Unlock,
  CheckCircle,
  UserPlus,
  FileSignature,
  Home,
  Landmark,
  Route,
  Clock,
  Shield,
  X,
  Lock,
  Undo2,
  RotateCcw,
  Edit,
  ChevronDown,
  ChevronRight,
  Info,
  Eye,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import DocumentPicker from '@/components/shared/DocumentPicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocRef, RIGHTS_EVENT_KINDS, RightsEvent, RightsEventKind, SubmissionPayload, TargetLevel, canRestoreEvent, canUndoEvent, getTerminatingActionLabel } from '@udhbha/types';


interface RightsStepProps {
  submission: SubmissionPayload;
  onUpdate: (updates: Partial<SubmissionPayload>) => void;
  isEditable: boolean;
  setSelectedEntity: (entity: any) => void;
}

const TARGET_LEVELS: { value: TargetLevel; label: string }[] = [
  { value: 'PARCEL', label: 'Parcel' },
  { value: 'BUILDING', label: 'Building' },
  { value: 'FLOOR', label: 'Floor' },
  { value: 'UNIT', label: 'Unit (Component)' },
  { value: 'COMMON_AREA', label: 'Common Area' },
];

// Icon mapping for event kinds
const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ADD_OWNERSHIP: UserPlus,
  TRANSFER_OWNERSHIP: ArrowRightLeft,
  ADD_LEASE: FileSignature,
  END_LEASE: FileX,
  ADD_OCCUPANCY: Home,
  END_OCCUPANCY: DoorOpen,
  ADD_MORTGAGE: Landmark,
  RELEASE_MORTGAGE: Unlock,
  OPEN_DISPUTE: AlertTriangle,
  RESOLVE_DISPUTE: CheckCircle,
  ADD_EASEMENT: Route,
  END_EASEMENT: X,
};

const CATEGORY_COLORS: Record<string, string> = {
  ownership: 'hsl(25, 100%, 50%)',
  lease: 'hsl(45, 100%, 50%)',
  occupancy: 'hsl(175, 100%, 40%)',
  mortgage: 'hsl(0, 0%, 55%)',
  dispute: 'hsl(0, 70%, 55%)',
  easement: 'hsl(145, 65%, 45%)',
};

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ownership: UserPlus,
  lease: FileSignature,
  occupancy: Home,
  mortgage: Landmark,
  dispute: AlertTriangle,
  easement: Route,
};

const RightsStep: React.FC<RightsStepProps> = ({
  submission,
  onUpdate,
  isEditable,
  setSelectedEntity
}) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('current');

  // Form state for adding new event
  const [eventKind, setEventKind] = useState<RightsEventKind>('ADD_OWNERSHIP');
  const [targetLevel, setTargetLevel] = useState<TargetLevel>('UNIT');
  const [targetId, setTargetId] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [eventDocs, setEventDocs] = useState<DocRef[]>([]);

  // Payload fields (dynamic based on event kind)
  const [holder, setHolder] = useState('');
  const [share, setShare] = useState('1.0');
  const [previousHolder, setPreviousHolder] = useState('');
  const [lessor, setLessor] = useState('');
  const [lessee, setLessee] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [occupant, setOccupant] = useState('');
  const [purpose, setPurpose] = useState('');
  const [mortgagor, setMortgagor] = useState('');
  const [mortgagee, setMortgagee] = useState('');
  const [principal, setPrincipal] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [claimant, setClaimant] = useState('');
  const [respondent, setRespondent] = useState('');
  const [caseNo, setCaseNo] = useState('');
  const [disputeNature, setDisputeNature] = useState('');
  const [resolution, setResolution] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [easementNature, setEasementNature] = useState('');

  // Ensure rights_events exists
  const rightsEvents = submission.rights_events || [];

  // Check if this is a revision (has parent)
  const isRevision = !!submission.meta.parent_submission_id;
  const submissionStatus = submission.meta.status;
  const canModifyDraft = canModifyDraftEvents(submissionStatus);

  // Compute claims from events
  const baselineEvents = useMemo(() => getBaselineEvents(rightsEvents), [rightsEvents]);
  const draftEvents = useMemo(() => getDraftEvents(rightsEvents), [rightsEvents]);

  // Compute baseline claims (from approved events only)
  const baselineClaims = useMemo(() => {
    return computeBaselineClaims(rightsEvents);
  }, [rightsEvents]);

  // Compute current effective claims (baseline + active draft events)
  const effectiveClaims = useMemo(() => {
    return computeClaimsFromEvents(rightsEvents);
  }, [rightsEvents]);

  const claimCounts = useMemo(() => getClaimCounts(effectiveClaims), [effectiveClaims]);
  const activeDraftCount = useMemo(() => getActiveDraftCount(rightsEvents), [rightsEvents]);
  const undoneDraftCount = useMemo(() => getUndoneDraftCount(rightsEvents), [rightsEvents]);

  // Get target options based on level
  const getTargetOptions = (level: TargetLevel) => {
    switch (level) {
      case 'PARCEL':
        return [{ id: submission.parcel.parcel_id, label: submission.parcel.name || 'Parcel' }];
      case 'BUILDING':
        return submission.buildings.map(b => ({ id: b.building_id, label: b.name }));
      case 'FLOOR':
        return submission.floors.map(f => ({ id: f.floor_id, label: `L${f.level}: ${f.label}` }));
      case 'UNIT':
      case 'COMMON_AREA':
        return submission.components
          .filter(c => !c.active.to)
          .map(c => ({ id: c.component_id, label: c.label }));
      default:
        return [];
    }
  };

  const resetForm = () => {
    setEventKind('ADD_OWNERSHIP');
    setTargetLevel('UNIT');
    setTargetId('');
    setEventNote('');
    setEventDocs([]);
    setHolder('');
    setShare('1.0');
    setPreviousHolder('');
    setLessor('');
    setLessee('');
    setRentAmount('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setOccupant('');
    setPurpose('');
    setMortgagor('');
    setMortgagee('');
    setPrincipal('');
    setRegistrationNo('');
    setClaimant('');
    setRespondent('');
    setCaseNo('');
    setDisputeNature('');
    setResolution('');
    setBeneficiary('');
    setEasementNature('');
  };

  const buildPayload = (): Record<string, any> => {
    const kindMeta = RIGHTS_EVENT_KINDS.find(k => k.kind === eventKind);
    const category = kindMeta?.category;

    switch (category) {
      case 'ownership':
        return {
          holder,
          share: parseFloat(share),
          ...(eventKind === 'TRANSFER_OWNERSHIP' && previousHolder ? { previous_holder: previousHolder } : {}),
        };
      case 'lease':
        return {
          lessor,
          lessee,
          start_date: startDate,
          ...(endDate ? { end_date: endDate } : {}),
          ...(rentAmount ? { rent_amount: rentAmount } : {}),
        };
      case 'occupancy':
        return {
          occupant,
          ...(purpose ? { purpose } : {}),
        };
      case 'mortgage':
        return {
          mortgagor,
          mortgagee,
          ...(principal ? { principal } : {}),
          ...(registrationNo ? { registration_no: registrationNo } : {}),
        };
      case 'dispute':
        return {
          claimant,
          respondent,
          nature: disputeNature,
          ...(caseNo ? { case_no: caseNo } : {}),
          ...(eventKind === 'RESOLVE_DISPUTE' && resolution ? { resolution } : {}),
        };
      case 'easement':
        return {
          beneficiary,
          nature: easementNature,
        };
      default:
        return {};
    }
  };

  const handleAddEvent = () => {
    if (!targetId) {
      toast.error('Please select a target');
      return;
    }

    const payload = buildPayload();

    // RULE 6: Validate event before creation
    const validation = validateRightsEvent(
      eventKind,
      targetLevel,
      targetId,
      payload,
      submission
    );

    if (!validation.valid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    // Show warnings but don't block
    validation.warnings.forEach(warn => toast.warning(warn));

    const event = createRightsEvent(
      eventKind,
      targetLevel,
      targetId,
      payload,
      eventDocs,
      eventNote || undefined,
      submission.meta.created_by
    );

    onUpdate({
      rights_events: [...rightsEvents, event],
    });

    toast.success('Rights event recorded');
    setShowAddDialog(false);
    resetForm();
    // Switch to history tab to show the new event
    setActiveTab('history');
  };

  const handleUndoEvent = (event: RightsEvent) => {
    if (!canUndoEvent(event, submissionStatus)) {
      toast.error('Cannot undo this event');
      return;
    }

    const updatedEvents = undoEvent(rightsEvents, event.event_id);
    onUpdate({ rights_events: updatedEvents });
    toast.success('Event undone - can be restored before submission');
  };

  const handleRestoreEvent = (event: RightsEvent) => {
    if (!canRestoreEvent(event, submissionStatus)) {
      toast.error('Cannot restore this event');
      return;
    }

    const updatedEvents = restoreEvent(rightsEvents, event.event_id);
    onUpdate({ rights_events: updatedEvents });
    toast.success('Event restored');
  };

  // Quick action to end/resolve/release an existing claim
  const handleQuickTerminate = (
    category: string,
    targetLevel: TargetLevel,
    targetId: string,
    currentHolder?: string
  ) => {
    let terminateKind: RightsEventKind;

    switch (category) {
      case 'ownership':
        // For ownership, we open transfer dialog
        setEventKind('TRANSFER_OWNERSHIP');
        setPreviousHolder(currentHolder || '');
        break;
      case 'lease':
        terminateKind = 'END_LEASE';
        break;
      case 'occupancy':
        terminateKind = 'END_OCCUPANCY';
        break;
      case 'mortgage':
        terminateKind = 'RELEASE_MORTGAGE';
        break;
      case 'dispute':
        terminateKind = 'RESOLVE_DISPUTE';
        break;
      case 'easement':
        terminateKind = 'END_EASEMENT';
        break;
      default:
        return;
    }

    setTargetLevel(targetLevel);
    setTargetId(targetId);

    if (category !== 'ownership') {
      setEventKind(terminateKind!);
    }

    setShowAddDialog(true);
  };

  const renderPayloadFields = () => {
    const kindMeta = RIGHTS_EVENT_KINDS.find(k => k.kind === eventKind);
    const category = kindMeta?.category;

    switch (category) {
      case 'ownership':
        return (
          <>
            {eventKind === 'TRANSFER_OWNERSHIP' && (
              <div className="space-y-2">
                <Label>Previous Holder</Label>
                <Input
                  value={previousHolder}
                  onChange={e => setPreviousHolder(e.target.value)}
                  placeholder="Previous owner (optional)"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Holder *</Label>
                <Input
                  value={holder}
                  onChange={e => setHolder(e.target.value)}
                  placeholder="e.g., did:user:john"
                />
              </div>
              <div className="space-y-2">
                <Label>Share (0-1)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={share}
                  onChange={e => setShare(e.target.value)}
                />
              </div>
            </div>
          </>
        );

      case 'lease':
        return eventKind === 'END_LEASE' ? (
          <div className="p-4 bg-muted rounded-lg text-center">
            <FileX className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This will record the end of the active lease on the selected target.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lessor *</Label>
                <Input
                  value={lessor}
                  onChange={e => setLessor(e.target.value)}
                  placeholder="Property owner"
                />
              </div>
              <div className="space-y-2">
                <Label>Lessee *</Label>
                <Input
                  value={lessee}
                  onChange={e => setLessee(e.target.value)}
                  placeholder="Tenant"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rent Amount</Label>
                <Input
                  value={rentAmount}
                  onChange={e => setRentAmount(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </>
        );

      case 'occupancy':
        return eventKind === 'END_OCCUPANCY' ? (
          <div className="p-4 bg-muted rounded-lg text-center">
            <DoorOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This will record the vacating of the selected unit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Occupant *</Label>
              <Input
                value={occupant}
                onChange={e => setOccupant(e.target.value)}
                placeholder="Person/entity occupying"
              />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        );

      case 'mortgage':
        return eventKind === 'RELEASE_MORTGAGE' ? (
          <div className="p-4 bg-muted rounded-lg text-center">
            <Unlock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This will release the mortgage lien on the selected property.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mortgagor (Owner) *</Label>
                <Input
                  value={mortgagor}
                  onChange={e => setMortgagor(e.target.value)}
                  placeholder="Property owner"
                />
              </div>
              <div className="space-y-2">
                <Label>Mortgagee (Lender) *</Label>
                <Input
                  value={mortgagee}
                  onChange={e => setMortgagee(e.target.value)}
                  placeholder="Bank/lender"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Principal Amount</Label>
                <Input
                  value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Registration No.</Label>
                <Input
                  value={registrationNo}
                  onChange={e => setRegistrationNo(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </>
        );

      case 'dispute':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Claimant *</Label>
                <Input
                  value={claimant}
                  onChange={e => setClaimant(e.target.value)}
                  placeholder="Party raising dispute"
                />
              </div>
              <div className="space-y-2">
                <Label>Respondent *</Label>
                <Input
                  value={respondent}
                  onChange={e => setRespondent(e.target.value)}
                  placeholder="Defending party"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Case No.</Label>
                <Input
                  value={caseNo}
                  onChange={e => setCaseNo(e.target.value)}
                  placeholder="Court case number"
                />
              </div>
              <div className="space-y-2">
                <Label>Nature of Dispute *</Label>
                <Input
                  value={disputeNature}
                  onChange={e => setDisputeNature(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
            </div>
            {eventKind === 'RESOLVE_DISPUTE' && (
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Textarea
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  placeholder="How was the dispute resolved?"
                />
              </div>
            )}
          </>
        );

      case 'easement':
        return eventKind === 'END_EASEMENT' ? (
          <div className="p-4 bg-muted rounded-lg text-center">
            <X className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This will terminate the easement on the selected property.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Beneficiary *</Label>
              <Input
                value={beneficiary}
                onChange={e => setBeneficiary(e.target.value)}
                placeholder="Party benefiting from easement"
              />
            </div>
            <div className="space-y-2">
              <Label>Nature *</Label>
              <Input
                value={easementNature}
                onChange={e => setEasementNature(e.target.value)}
                placeholder="e.g., right of way"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render a single claim tile (read-only version for Current View tab)
  const renderReadOnlyClaimTile = (claim: any) => {
    const isActive = claim.status === 'ACTIVE';
    const categoryColor = CATEGORY_COLORS[claim.category] || 'hsl(0, 0%, 50%)';

    return (
      <Card
        key={claim.id}
        className={cn("transition-all", !isActive && "opacity-50")}
        style={{ borderLeftColor: categoryColor, borderLeftWidth: '4px' }}
      >
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2">
              <span className="capitalize font-medium">{claim.category}</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5"
                style={{
                  backgroundColor: getClaimStatusColor(claim.status),
                  color: 'white',
                  borderColor: 'transparent'
                }}
              >
                {claim.status}
              </Badge>
            </CardTitle>
          </div>
          <CardDescription className="font-mono text-[10px]">
            {formatTarget(claim.target)}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-0 pb-2 px-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            {claim.holder && (
              <div>
                <span className="text-muted-foreground">Holder:</span>
                <span className="ml-1 font-medium">{claim.holder}</span>
              </div>
            )}
            {claim.share !== undefined && (
              <div>
                <span className="text-muted-foreground">Share:</span>
                <span className="ml-1">{(claim.share * 100).toFixed(0)}%</span>
              </div>
            )}
            {claim.lessee && (
              <div>
                <span className="text-muted-foreground">Lessee:</span>
                <span className="ml-1 font-medium">{claim.lessee}</span>
              </div>
            )}
            {claim.occupant && (
              <div>
                <span className="text-muted-foreground">Occupant:</span>
                <span className="ml-1 font-medium">{claim.occupant}</span>
              </div>
            )}
            {claim.mortgagee && (
              <div>
                <span className="text-muted-foreground">Lender:</span>
                <span className="ml-1 font-medium">{claim.mortgagee}</span>
              </div>
            )}
            {claim.claimant && (
              <div>
                <span className="text-muted-foreground">Claimant:</span>
                <span className="ml-1 font-medium">{claim.claimant}</span>
              </div>
            )}
            {claim.beneficiary && (
              <div>
                <span className="text-muted-foreground">Beneficiary:</span>
                <span className="ml-1 font-medium">{claim.beneficiary}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render a single claim tile with update action
  const renderClaimTileWithAction = (claim: any) => {
    const isActive = claim.status === 'ACTIVE';
    const categoryColor = CATEGORY_COLORS[claim.category] || 'hsl(0, 0%, 50%)';

    return (
      <Card
        key={claim.id}
        className={cn("transition-all", !isActive && "opacity-50")}
        style={{ borderLeftColor: categoryColor, borderLeftWidth: '4px' }}
      >
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2">
              <span className="capitalize font-medium">{claim.category}</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5"
                style={{
                  backgroundColor: getClaimStatusColor(claim.status),
                  color: 'white',
                  borderColor: 'transparent'
                }}
              >
                {claim.status}
              </Badge>
            </CardTitle>
            {isEditable && isActive && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickTerminate(
                    claim.category,
                    claim.target.level,
                    claim.target.id,
                    claim.holder
                  );
                }}
              >
                {getTerminatingActionLabel(claim.category)}
              </Button>
            )}
          </div>
          <CardDescription className="font-mono text-[10px]">
            {formatTarget(claim.target)}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-0 pb-2 px-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            {claim.holder && (
              <div>
                <span className="text-muted-foreground">Holder:</span>
                <span className="ml-1 font-medium">{claim.holder}</span>
              </div>
            )}
            {claim.share !== undefined && (
              <div>
                <span className="text-muted-foreground">Share:</span>
                <span className="ml-1">{(claim.share * 100).toFixed(0)}%</span>
              </div>
            )}
            {claim.lessee && (
              <div>
                <span className="text-muted-foreground">Lessee:</span>
                <span className="ml-1 font-medium">{claim.lessee}</span>
              </div>
            )}
            {claim.occupant && (
              <div>
                <span className="text-muted-foreground">Occupant:</span>
                <span className="ml-1 font-medium">{claim.occupant}</span>
              </div>
            )}
            {claim.mortgagee && (
              <div>
                <span className="text-muted-foreground">Lender:</span>
                <span className="ml-1 font-medium">{claim.mortgagee}</span>
              </div>
            )}
            {claim.claimant && (
              <div>
                <span className="text-muted-foreground">Claimant:</span>
                <span className="ml-1 font-medium">{claim.claimant}</span>
              </div>
            )}
            {claim.beneficiary && (
              <div>
                <span className="text-muted-foreground">Beneficiary:</span>
                <span className="ml-1 font-medium">{claim.beneficiary}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render baseline claim tile (locked)
  const renderBaselineClaimTile = (claim: any) => {
    const isActive = claim.status === 'ACTIVE';
    const categoryColor = CATEGORY_COLORS[claim.category] || 'hsl(0, 0%, 50%)';

    return (
      <Card
        key={claim.id}
        className={cn("transition-all opacity-60 bg-muted/50", !isActive && "opacity-40")}
        style={{ borderLeftColor: categoryColor, borderLeftWidth: '4px' }}
      >
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-2">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="capitalize font-medium">{claim.category}</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5"
                style={{
                  backgroundColor: getClaimStatusColor(claim.status),
                  color: 'white',
                  borderColor: 'transparent'
                }}
              >
                {claim.status}
              </Badge>
            </CardTitle>
          </div>
          <CardDescription className="font-mono text-[10px]">
            {formatTarget(claim.target)}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-0 pb-2 px-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            {claim.holder && (
              <div>
                <span className="text-muted-foreground">Holder:</span>
                <span className="ml-1 font-medium">{claim.holder}</span>
              </div>
            )}
            {claim.share !== undefined && (
              <div>
                <span className="text-muted-foreground">Share:</span>
                <span className="ml-1">{(claim.share * 100).toFixed(0)}%</span>
              </div>
            )}
            {claim.lessee && (
              <div>
                <span className="text-muted-foreground">Lessee:</span>
                <span className="ml-1 font-medium">{claim.lessee}</span>
              </div>
            )}
            {claim.occupant && (
              <div>
                <span className="text-muted-foreground">Occupant:</span>
                <span className="ml-1 font-medium">{claim.occupant}</span>
              </div>
            )}
            {claim.mortgagee && (
              <div>
                <span className="text-muted-foreground">Lender:</span>
                <span className="ml-1 font-medium">{claim.mortgagee}</span>
              </div>
            )}
            {claim.claimant && (
              <div>
                <span className="text-muted-foreground">Claimant:</span>
                <span className="ml-1 font-medium">{claim.claimant}</span>
              </div>
            )}
            {claim.beneficiary && (
              <div>
                <span className="text-muted-foreground">Beneficiary:</span>
                <span className="ml-1 font-medium">{claim.beneficiary}</span>
              </div>
            )}
            {claim.nature && (
              <div className="col-span-2 mt-1 p-1.5 bg-muted rounded border">
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Nature:</span>
                <span className="font-medium text-[10px]">{claim.nature}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Convert claims to a flat list with category and priority
  const flattenClaims = (claims: typeof effectiveClaims) => {
    const priorityMap: Record<string, number> = {
      'dispute': 1,
      'ownership': 2,
      'mortgage': 3,
      'lease': 4,
      'occupancy': 5,
      'easement': 6
    };

    const flat = [
      ...claims.ownership.map(c => ({ ...c, category: 'ownership' })),
      ...claims.leases.map(c => ({ ...c, category: 'lease' })),
      ...claims.occupancies.map(c => ({ ...c, category: 'occupancy' })),
      ...claims.mortgages.map(c => ({ ...c, category: 'mortgage' })),
      ...claims.disputes.map(c => ({ ...c, category: 'dispute' })),
      ...claims.easements.map(c => ({ ...c, category: 'easement' })),
    ];

    // Sort by target level (Parcel first) then ID, then priority
    const levelOrder: Record<string, number> = { 'PARCEL': 1, 'BUILDING': 2, 'FLOOR': 3, 'UNIT': 4, 'COMMON_AREA': 5 };

    return flat.sort((a, b) => {
      // First sort by entity Level
      const levelDiff = (levelOrder[a.target.level] || 99) - (levelOrder[b.target.level] || 99);
      if (levelDiff !== 0) return levelDiff;

      // Then by target ID
      if (a.target.id !== b.target.id) return a.target.id.localeCompare(b.target.id);

      // Finally by category priority
      return (priorityMap[a.category] || 99) - (priorityMap[b.category] || 99);
    });
  };

  const baselineClaimsList = flattenClaims(baselineClaims);
  const effectiveClaimsList = flattenClaims(effectiveClaims);
  const activeEffectiveClaims = effectiveClaimsList.filter((c: any) => c.status === 'ACTIVE');
  const endedEffectiveClaims = effectiveClaimsList.filter((c: any) => c.status !== 'ACTIVE');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Step 5: Rights & Claims</h2>
          <p className="text-sm text-muted-foreground">
            Append-only property rights management
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(claimCounts).map(([key, counts]) => (
          <div key={key} className="p-2 bg-muted rounded text-center">
            <div className="text-lg font-bold">{counts.active}</div>
            <div className="text-[10px] text-muted-foreground capitalize">{key}</div>
          </div>
        ))}
      </div>

      {/* Revision notice */}
      {isRevision && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Revision Mode</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Baseline rights from the approved record are locked. Add new events to update claims.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current" className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Current View</span>
            <span className="sm:hidden">Current</span>
          </TabsTrigger>
          <TabsTrigger value="update" className="flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Update Rights</span>
            <span className="sm:hidden">Update</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Event History</span>
            <span className="sm:hidden">History</span>
            {activeDraftCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {activeDraftCount}
              </Badge>
            )}
          </TabsTrigger>
          {isRevision && (
            <TabsTrigger value="baseline" className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Baseline</span>
              <span className="sm:hidden">Base</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Current View (Read-only snapshot) */}
        <TabsContent value="current" className="mt-4">
          <Card>
            <CardHeader className="py-3 px-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Current Effective Rights
                    <Badge variant="default" className="ml-2">
                      {activeEffectiveClaims.length} active
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Read-only view of computed property rights (baseline + active draft events)
                  </CardDescription>
                </div>
                {isEditable && (
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('update')}
                    className="gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Update Rights
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {effectiveClaimsList.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-sm text-muted-foreground">No rights recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Add rights events to register ownership, leases, and other claims
                  </p>
                  {isEditable && (
                    <Button onClick={() => setActiveTab('update')} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add First Right
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-450px)] min-h-[400px] pr-4">
                  <div className="space-y-4">

                    {/* ACTIVE rights at the top */}
                    {activeEffectiveClaims.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Shield className="w-3.5 h-3.5" />
                          <span className="font-medium uppercase tracking-wide">Active Rights ({activeEffectiveClaims.length})</span>
                        </div>
                        <div className="grid gap-3">
                          {activeEffectiveClaims.map((claim: any) => renderReadOnlyClaimTile(claim))}
                        </div>
                      </div>
                    )}

                    {/* ENDED/historical rights below, disabled styling */}
                    {endedEffectiveClaims.length > 0 && (
                      <div className="space-y-2">
                        <Separator className="my-3" />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <History className="w-3.5 h-3.5" />
                          <span className="font-medium uppercase tracking-wide">Previous Rights - Historical ({endedEffectiveClaims.length})</span>
                        </div>
                        <div className="grid gap-3 opacity-60">
                          {endedEffectiveClaims.map((claim: any) => renderReadOnlyClaimTile(claim))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Update Rights (Action-oriented) */}
        <TabsContent value="update" className="mt-4">
          <div className="space-y-4">
            {/* Quick Add Actions */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Add New Rights
                </CardTitle>
                <CardDescription className="text-xs">
                  Append new rights events to the ledger
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {!isEditable ? (
                  <div className="py-6 text-center">
                    <Lock className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      This submission is not editable
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-2"
                      onClick={() => { setEventKind('ADD_OWNERSHIP'); resetForm(); setShowAddDialog(true); }}
                    >
                      <UserPlus className="w-5 h-5 text-orange-500" />
                      <span className="text-xs">Add Ownership</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-2"
                      onClick={() => { setEventKind('ADD_LEASE'); resetForm(); setShowAddDialog(true); }}
                    >
                      <FileSignature className="w-5 h-5 text-yellow-500" />
                      <span className="text-xs">Add Lease</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-2"
                      onClick={() => { setEventKind('ADD_OCCUPANCY'); resetForm(); setShowAddDialog(true); }}
                    >
                      <Home className="w-5 h-5 text-cyan-500" />
                      <span className="text-xs">Add Occupancy</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-2"
                      onClick={() => { setEventKind('ADD_MORTGAGE'); resetForm(); setShowAddDialog(true); }}
                    >
                      <Landmark className="w-5 h-5 text-gray-500" />
                      <span className="text-xs">Add Mortgage</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-2"
                      onClick={() => { setEventKind('OPEN_DISPUTE'); resetForm(); setShowAddDialog(true); }}
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-xs">Open Dispute</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-2"
                      onClick={() => { setEventKind('ADD_EASEMENT'); resetForm(); setShowAddDialog(true); }}
                    >
                      <Route className="w-5 h-5 text-green-500" />
                      <span className="text-xs">Add Easement</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Claims with Update Actions */}
            {activeEffectiveClaims.length > 0 && isEditable && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Edit className="w-4 h-4 text-primary" />
                    Update Existing Rights
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click an action to modify an existing right (appends new event)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="grid gap-3">
                      {activeEffectiveClaims.map((claim: any) => renderClaimTileWithAction(claim))}
                    </div>
                  </ScrollArea>
                </CardContent>

              </Card>
            )}

            {/* Historical Claims (Ended/Transferred) - Read Only */}
            {endedEffectiveClaims.length > 0 && (
              <Card className="border-muted bg-muted/20">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <History className="w-4 h-4" />
                    Previous Rights (Historical)
                    <Badge variant="secondary" className="ml-2">
                      {endedEffectiveClaims.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ended or transferred rights - visible for reference but cannot be modified
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[200px] pr-4">
                    <div className="grid gap-3 opacity-60">
                      {endedEffectiveClaims.map((claim: any) => renderReadOnlyClaimTile(claim))}
                    </div>
                  </ScrollArea>
                </CardContent>

              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Event History */}
        <TabsContent value="history" className="mt-4">
          <div className="space-y-4">
            {/* Draft Events */}
            <Card className={cn(
              "border-dashed",
              activeDraftCount > 0 ? "border-blue-400" : "border-muted"
            )}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-500" />
                  Draft Events (This Session)
                  {activeDraftCount > 0 && (
                    <Badge variant="outline" className="ml-2 border-blue-400 text-blue-600">
                      {activeDraftCount} pending
                    </Badge>
                  )}
                  {undoneDraftCount > 0 && (
                    <Badge variant="outline" className="ml-1 border-muted">
                      {undoneDraftCount} undone
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Events added in this draft - can be undone before submission
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {draftEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No draft changes yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add events from the "Update Rights" tab
                    </p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-2">

                        {draftEvents.map((event) => {
                          const IconComponent = EVENT_ICONS[event.kind] || Clock;
                          const kindMeta = RIGHTS_EVENT_KINDS.find(k => k.kind === event.kind);
                          const isUndone = event.draft_state === 'UNDONE';
                          const canUndo = canUndoEvent(event, submissionStatus);
                          const canRestore = canRestoreEvent(event, submissionStatus);

                          return (
                            <Card
                              key={event.event_id}
                              className={cn(
                                "transition-all",
                                isUndone && "opacity-50 bg-muted/30"
                              )}
                            >
                              <CardHeader className="py-2 px-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-xs flex items-center gap-2">
                                    <IconComponent className={cn(
                                      "w-3 h-3",
                                      kindMeta?.isTerminating ? "text-destructive" : "text-primary"
                                    )} />
                                    {kindMeta?.label || event.kind}
                                    {isUndone && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        UNDONE
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(event.ts).toLocaleTimeString()}
                                    </span>
                                    <TooltipProvider>
                                      {canUndo && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6"
                                              onClick={() => handleUndoEvent(event)}
                                            >
                                              <Undo2 className="w-3 h-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Undo this change</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {canRestore && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-6 w-6 text-green-600"
                                              onClick={() => handleRestoreEvent(event)}
                                            >
                                              <RotateCcw className="w-3 h-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Restore this change</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {!canModifyDraft && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Lock className="w-3 h-3 text-muted-foreground ml-1" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Revision is submitted and locked</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </TooltipProvider>
                                  </div>
                                </div>
                                <CardDescription className="font-mono text-[10px]">
                                  {formatTarget(event.target)}
                                </CardDescription>
                              </CardHeader>
                              {event.note && (
                                <CardContent className="py-0 pb-2 px-3">
                                  <p className="text-[10px] text-muted-foreground italic">{event.note}</p>
                                </CardContent>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {canModifyDraft && draftEvents.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Info className="w-3 h-3" />
                          <span>Undo available until you submit this revision.</span>
                        </div>
                      </div>
                    )}

                    {!canModifyDraft && draftEvents.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 text-xs text-amber-600">
                          <Lock className="w-3 h-3" />
                          <span>This revision is submitted and locked. Create a new revision to make changes.</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Baseline Events (Approved History) */}
            {baselineEvents.length > 0 && (
              <Card className="border-muted">
                <CardHeader className="py-3 px-4 bg-muted/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Approved Events (Locked History)
                    <Badge variant="secondary" className="ml-2">
                      {baselineEvents.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    These events are from approved records and cannot be modified
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-2">

                      {baselineEvents.map((event) => {
                        const IconComponent = EVENT_ICONS[event.kind] || Clock;
                        const kindMeta = RIGHTS_EVENT_KINDS.find(k => k.kind === event.kind);

                        return (
                          <Card key={event.event_id} className="opacity-60 bg-muted/30">
                            <CardHeader className="py-2 px-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-xs flex items-center gap-2">
                                  <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                  <IconComponent className={cn(
                                    "w-3 h-3",
                                    kindMeta?.isTerminating ? "text-destructive/60" : "text-primary/60"
                                  )} />
                                  {kindMeta?.label || event.kind}
                                </CardTitle>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(event.ts).toLocaleDateString()}
                                </span>
                              </div>
                              <CardDescription className="font-mono text-[10px]">
                                {formatTarget(event.target)}
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab 4: Baseline (Locked, Revision only) */}
        {isRevision && (
          <TabsContent value="baseline" className="mt-4">
            <Card className="border-muted">
              <CardHeader className="py-3 px-4 bg-muted/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Approved Baseline Rights (Locked)
                  <Badge variant="secondary" className="ml-2">
                    {baselineClaimsList.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Rights from the approved parent record - cannot be modified directly
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {baselineClaimsList.length === 0 ? (
                  <div className="py-8 text-center">
                    <Shield className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No baseline rights</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The parent submission had no recorded rights
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-450px)] min-h-[400px] pr-4">
                    <div className="grid gap-3">
                      {baselineClaimsList.map((claim: any) => renderBaselineClaimTile(claim))}
                    </div>
                  </ScrollArea>
                )}

                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <span>To modify these rights, use the "Update Rights" tab to append new events.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Record Rights Event
            </DialogTitle>
            <DialogDescription>
              This event will be permanently recorded in the rights ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Event Kind */}
            <div className="space-y-2">
              <Label>Event Type *</Label>
              <Select value={eventKind} onValueChange={(v) => setEventKind(v as RightsEventKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RIGHTS_EVENT_KINDS.map(kind => {
                    const IconComp = EVENT_ICONS[kind.kind] || Clock;
                    return (
                      <SelectItem key={kind.kind} value={kind.kind}>
                        <span className="flex items-center gap-2">
                          <IconComp className="w-4 h-4" />
                          {kind.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {RIGHTS_EVENT_KINDS.find(k => k.kind === eventKind)?.description}
              </p>
            </div>

            {/* Target */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Level *</Label>
                <Select value={targetLevel} onValueChange={(v) => { setTargetLevel(v as TargetLevel); setTargetId(''); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target *</Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getTargetOptions(targetLevel).map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Dynamic payload fields */}
            {renderPayloadFields()}

            <Separator />

            {/* Audit note */}
            <div className="space-y-2">
              <Label>Audit Note</Label>
              <Textarea
                value={eventNote}
                onChange={e => setEventNote(e.target.value)}
                placeholder="Reason for this change (recommended)"
                className="h-20"
              />
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <DocumentPicker
                value={eventDocs}
                onChange={setEventDocs}
                label="Supporting Documents"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEvent}>
              <Plus className="w-4 h-4 mr-1" />
              Record Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RightsStep;
