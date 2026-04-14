import React, { useState, useMemo, useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building, 
  Layers, 
  LayoutGrid, 
  Scale, 
  FileText, 
  PenLine,
  RefreshCw,
  Send
} from 'lucide-react';
import { ChangeKind, SubmissionPayload } from '@udhbha/types';


interface SubmitRevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionPayload;
  parentSubmission: SubmissionPayload | null;
  onConfirm: (changeKind: ChangeKind, changeNote: string) => void;
}

const CHANGE_KIND_ICONS: Partial<Record<DetectedChangeKind, React.ReactNode>> = {
  ADD_FLOOR: <Layers className="w-4 h-4" />,
  GEOMETRY_CORRECTION: <PenLine className="w-4 h-4" />,
  DEACTIVATE_COMPONENT: <LayoutGrid className="w-4 h-4" />,
  MERGE_COMPONENTS: <LayoutGrid className="w-4 h-4" />,
  SPLIT_COMPONENTS: <LayoutGrid className="w-4 h-4" />,
  RIGHTS_CHANGE: <Scale className="w-4 h-4" />,
  LEASE_CHANGE: <Scale className="w-4 h-4" />,
  MORTGAGE_CHANGE: <Scale className="w-4 h-4" />,
  DISPUTE_CHANGE: <Scale className="w-4 h-4" />,
  TOPOLOGY_CHANGE: <Building className="w-4 h-4" />,
  MULTI_CHANGE: <FileText className="w-4 h-4" />,
  OTHER_CHANGES: <FileText className="w-4 h-4" />,
};

const SubmitRevisionModal: React.FC<SubmitRevisionModalProps> = ({
  open,
  onOpenChange,
  submission,
  parentSubmission,
  onConfirm,
}) => {
  const [changeNote, setChangeNote] = useState('');
  const [hasEditedNote, setHasEditedNote] = useState(false);

  // Detect changes between current submission and parent
  const detection = useMemo(() => {
    if (!parentSubmission) {
      return {
        primaryKind: 'OTHER_CHANGES' as DetectedChangeKind,
        detectedKinds: [] as DetectedChangeKind[],
        autoSummary: 'No parent submission found.',
      };
    }
    return detectChangeKind(submission, parentSubmission);
  }, [submission, parentSubmission]);

  // Update change note when detection changes (but only if user hasn't manually edited)
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
    setChangeNote(detection.autoSummary);
    setHasEditedNote(false);
  };

  const handleConfirm = () => {
    const canonicalKind = toCanonicalChangeKind(detection.primaryKind);
    onConfirm(canonicalKind, changeNote.trim() || detection.autoSummary);
  };

  const icon = CHANGE_KIND_ICONS[detection.primaryKind] || <FileText className="w-4 h-4" />;
  const label = getChangeKindLabel(detection.primaryKind);

  // Don't render content if submission is null
  if (!submission) {
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
            <Send className="w-5 h-5" />
            Submit Revision for Review
          </DialogTitle>
          <DialogDescription>
            Review the detected changes and update the summary before submitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Submission Info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Submission</span>
              <span className="text-sm font-mono">{submission.meta.submission_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revision</span>
              <Badge variant="outline" className="font-mono">
                #{submission.meta.revision_number ?? 1}
              </Badge>
            </div>
            {parentSubmission && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Parent</span>
                <span className="text-sm font-mono text-muted-foreground">
                  {parentSubmission.meta.submission_id}
                </span>
              </div>
            )}
          </div>

          {/* Detected Change Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Detected Change Type</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                {icon}
                {label}
              </Badge>
              {detection.detectedKinds.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  ({detection.detectedKinds.length} change types detected)
                </span>
              )}
            </div>
          </div>

          {/* Change Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="change-note" className="text-sm font-medium">
                Change Summary
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRecompute}
                className="h-7 text-xs gap-1"
                disabled={!hasEditedNote}
              >
                <RefreshCw className="w-3 h-3" />
                Recompute
              </Button>
            </div>
            <Textarea
              id="change-note"
              value={changeNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Describe the changes made in this revision..."
              className="min-h-[120px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This summary will be stored in the submission record for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="gap-1">
            <Send className="w-4 h-4" />
            Submit for Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitRevisionModal;
