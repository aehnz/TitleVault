import React, { useState } from 'react';

import { toast } from 'sonner';
import SubmitRevisionModal from '@/components/revision/SubmitRevisionModal';
import { ChangeKind, SubmissionPayload } from '@udhbha/types';


interface ReviewStepProps {
  submission: SubmissionPayload;
  onUpdate: (updates: Partial<SubmissionPayload>) => void;
  isEditable: boolean;
  setSelectedEntity: (entity: any) => void;
  onSubmit: (changeKind?: ChangeKind, changeNote?: string) => void;
  parentSubmission?: SubmissionPayload | null;
  onSaveDraft?: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ 
  submission, 
  onUpdate, 
  isEditable,
  setSelectedEntity,
  onSubmit,
  parentSubmission,
  onSaveDraft,
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const validation = validateSubmission(submission);

  // Determine if this is a revision (revision_number > 1)
  const isRevision = (submission.meta.revision_number ?? 1) > 1;

  const handleSaveDraft = () => {
    onSaveDraft?.();
    toast.success('Draft saved');
  };

  const handleSubmitClick = () => {
    if (isRevision) {
      // For revisions, show the modal to confirm change summary
      setShowSubmitModal(true);
    } else {
      // For original submissions, submit directly
      onSubmit();
    }
  };

  const handleRevisionSubmitConfirm = (changeKind: ChangeKind, changeNote: string) => {
    setShowSubmitModal(false);
    onSubmit(changeKind, changeNote);
  };

  const stats = [
    { label: 'Anchors', value: submission.parcel.anchors.length, required: 3 },
    { label: 'Buildings', value: submission.buildings.length, required: 0 },
    { label: 'Floors', value: submission.floors.length, required: 0 },
    { label: 'Components', value: submission.components.length, required: 0 },
    { label: 'Claims', value: submission.claims.length, required: 0 },
    { label: 'Documents', value: submission.documents.length, required: 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Step 6: Review & Submit</h2>
        <p className="text-muted-foreground">Validate your submission before final submit</p>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Summary</CardTitle>
          <CardDescription>Overview of all entities in this submission</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  {stat.label}
                  {stat.required > 0 && stat.value < stat.required && (
                    <span className="text-destructive">(min {stat.required})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {validation.valid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            Validation Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validation.critical.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Critical Issues (must fix to submit)
              </h4>
              {validation.critical.map((issue, i) => (
                <Alert key={i} variant="destructive">
                  <AlertDescription>{issue}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-orange-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings
              </h4>
              {validation.warnings.map((warning, i) => (
                <Alert key={i} className="border-orange-200 bg-orange-50 text-orange-700">
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {validation.valid && validation.warnings.length === 0 && (
            <Alert className="border-green-200 bg-green-50 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <AlertTitle>Ready to Submit</AlertTitle>
              <AlertDescription>
                All validations passed. Your submission is ready for review.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Return Comment if present */}
      {submission.meta.return_comment && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <AlertTitle className="text-orange-700">Return Comments from Reviewer</AlertTitle>
          <AlertDescription className="text-orange-600">
            {submission.meta.return_comment}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={handleSaveDraft} className="gap-1">
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button 
              onClick={handleSubmitClick} 
              disabled={!validation.valid}
              className="gap-1"
            >
              <Send className="w-4 h-4" />
              Submit for Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submit Revision Modal */}
      <SubmitRevisionModal
        open={showSubmitModal}
        onOpenChange={setShowSubmitModal}
        submission={submission}
        parentSubmission={parentSubmission ?? null}
        onConfirm={handleRevisionSubmitConfirm}
      />

      {/* Topology Events Log */}
      {submission.topology_events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topology Events Log</CardTitle>
            <CardDescription>History of structural changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {submission.topology_events.map((event) => (
                <div 
                  key={event.event_id} 
                  className="p-2 rounded bg-muted/50 text-sm font-mono"
                  onClick={() => setSelectedEntity(event)}
                >
                  <span className="text-muted-foreground">{event.ts}</span>
                  <span className="mx-2 text-primary">{event.kind}</span>
                  {event.note && <span className="text-muted-foreground">- {event.note}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReviewStep;
