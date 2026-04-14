import React, { useState, useEffect, useMemo } from 'react';

import { ChangeKind, SubmissionPayload } from '@udhbha/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  detectChangeKind, 
  toCanonicalChangeKind, 
  getChangeKindLabel,
  DetectedChangeKind 
} from '@/lib/changeDetection';

interface CreateRevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (changeKind: ChangeKind, changeNote: string) => void;
  parentSubmission: SubmissionPayload;
  draftSubmission?: SubmissionPayload | null;
}

// Icons for change kinds
const CHANGE_KIND_ICONS: Partial<Record<DetectedChangeKind, React.ReactNode>> = {
  'ADD_FLOOR': <Layers className="w-4 h-4" />,
  'GEOMETRY_CORRECTION': <Settings className="w-4 h-4" />,
  'DEACTIVATE_COMPONENT': <Minimize2 className="w-4 h-4" />,
  'MERGE_COMPONENTS': <Merge className="w-4 h-4" />,
  'SPLIT_COMPONENTS': <GitBranch className="w-4 h-4" />,
  'RIGHTS_CHANGE': <ArrowRightLeft className="w-4 h-4" />,
  'LEASE_CHANGE': <FileText className="w-4 h-4" />,
  'MORTGAGE_CHANGE': <Landmark className="w-4 h-4" />,
  'DISPUTE_CHANGE': <AlertTriangle className="w-4 h-4" />,
  'TOPOLOGY_CHANGE': <Settings className="w-4 h-4" />,
  'MULTI_CHANGE': <Scale className="w-4 h-4" />,
  'OTHER_CHANGES': <FileText className="w-4 h-4" />,
  'MISC': <FileText className="w-4 h-4" />,
};

const CreateRevisionModal: React.FC<CreateRevisionModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  parentSubmission,
  draftSubmission,
}) => {
  const [changeNote, setChangeNote] = useState('');
  const [hasEditedNote, setHasEditedNote] = useState(false);

  // Detect change kind from events
  const detection = useMemo(() => {
    // Guard against null submission during navigation
    if (!parentSubmission) {
      return {
        primaryKind: 'OTHER_CHANGES' as DetectedChangeKind,
        detectedKinds: [],
        autoSummary: 'Auto-summary:\n- No changes detected yet.\n\nSurveyor notes:\n(You can edit or add more context here.)',
      };
    }
    
    // If we have a draft, compare to parent; otherwise just analyze parent for potential changes
    const submissionToAnalyze = draftSubmission || parentSubmission;
    const parent = draftSubmission ? parentSubmission : null;
    return detectChangeKind(submissionToAnalyze, parent);
  }, [parentSubmission, draftSubmission]);

  // Update auto-summary when detection changes (but preserve user edits)
  useEffect(() => {
    if (!hasEditedNote) {
      setChangeNote(detection.autoSummary);
    }
  }, [detection.autoSummary, hasEditedNote]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setHasEditedNote(false);
      setChangeNote(detection.autoSummary);
    }
  }, [open, detection.autoSummary]);

  const handleNoteChange = (value: string) => {
    setChangeNote(value);
    setHasEditedNote(true);
  };

  const handleRecompute = () => {
    setHasEditedNote(false);
    setChangeNote(detection.autoSummary);
  };

  const handleConfirm = () => {
    if (!changeNote.trim()) {
      return;
    }
    const canonicalKind = toCanonicalChangeKind(detection.primaryKind);
    onConfirm(canonicalKind, changeNote.trim());
    // Reset form
    setChangeNote('');
    setHasEditedNote(false);
  };

  const icon = CHANGE_KIND_ICONS[detection.primaryKind] || <FileText className="w-4 h-4" />;
  const label = getChangeKindLabel(detection.primaryKind);

  // Don't render content if parentSubmission is null
  if (!parentSubmission) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Create Revision
          </DialogTitle>
          <DialogDescription>
            Create a new draft revision from this approved submission. The original record remains unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Parent info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Parent Submission</p>
            <p className="font-mono text-sm">{parentSubmission.meta.submission_id}</p>
          </div>

          {/* Detected Change Kind (read-only computed label) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Detected Change Type
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-sm">
                        Auto-detected from topology and rights events. 
                        {detection.detectedKinds.length > 1 && (
                          <span className="block mt-1 text-xs text-muted-foreground">
                            Detected: {detection.detectedKinds.map(k => getChangeKindLabel(k)).join(', ')}
                          </span>
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
              <span className="flex items-center gap-2 text-sm font-medium">
                {icon}
                {label}
              </span>
              {detection.primaryKind === 'MULTI_CHANGE' && detection.detectedKinds.length > 1 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs cursor-help">
                        {detection.detectedKinds.length} types
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {detection.detectedKinds.map(k => getChangeKindLabel(k)).join(' + ')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Change Note (auto-generated + editable) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Change Note *</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRecompute}
                className="h-7 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Recompute
              </Button>
            </div>
            <Textarea
              value={changeNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Describe the reason for this revision..."
              className="min-h-32 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from events. You can edit freely. This note will be attached to the revision for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!changeNote.trim()}>
            <GitBranch className="w-4 h-4 mr-1" />
            Create Draft Revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRevisionModal;
