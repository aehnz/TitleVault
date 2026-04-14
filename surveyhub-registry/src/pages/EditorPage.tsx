import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useSubmission,
  useSubmissionList,
  useSaveDraft,
  useSubmitSubmission,
  useCreateRevision,
} from '@/hooks/useSubmissions';
import { isSubmissionLocked, isSubmissionEditable } from '@/lib/revisions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Save, ArrowLeft, Upload, GitBranch, History, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/shared/StatusBadge';
import WizardStepper from '@/components/editor/WizardStepper';
import ParcelStep from '@/components/editor/steps/ParcelStep';
import BuildingsStep from '@/components/editor/steps/BuildingsStep';
import FloorsStep from '@/components/editor/steps/FloorsStep';
import ComponentsStep from '@/components/editor/steps/ComponentsStep';
import RightsStep from '@/components/editor/steps/RightsStep';
import ReviewStep from '@/components/editor/steps/ReviewStep';
import InspectorPanel from '@/components/editor/InspectorPanel';
import JsonPanel from '@/components/editor/JsonPanel';
import Viewer3D from '@/components/viewer/Viewer3D';
import RevisionInfoBanner from '@/components/revision/RevisionInfoBanner';
import RevisionHistoryPanel from '@/components/revision/RevisionHistoryPanel';
import CreateRevisionModal from '@/components/revision/CreateRevisionModal';
import { ChangeKind, SubmissionPayload, SelectableEntity } from '@udhbha/types';
import { EditorSkeleton } from '@/components/shared/Skeletons';
import { processImportedJson } from '@/lib/importJson';


const STEPS = [
  { id: 1, label: 'Parcel', description: 'Define parcel and anchors' },
  { id: 2, label: 'Buildings', description: 'Add buildings to parcel' },
  { id: 3, label: 'Floors', description: 'Define floor levels' },
  { id: 4, label: 'Components', description: 'Add floor components' },
  { id: 5, label: 'Rights / Claims', description: 'Define ownership & claims' },
  { id: 6, label: 'Review & Submit', description: 'Validate and submit' },
];

const EditorPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  // React Query hooks — each targets a precise data slice
  const { data: fetchedSubmission, isLoading } = useSubmission(submissionId);
  const { data: allSubmissions = [] } = useSubmissionList();
  const saveDraftMutation = useSaveDraft();
  const submitMutation = useSubmitSubmission();
  const revisionMutation = useCreateRevision();

  // Local working draft — only this component re-renders on edits
  const [workingDraft, setWorkingDraft] = useState<SubmissionPayload | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showViewer, setShowViewer] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SelectableEntity | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync fetched data into local draft when it arrives or changes
  useEffect(() => {
    if (fetchedSubmission && (!workingDraft || workingDraft.meta.submission_id !== fetchedSubmission.meta.submission_id)) {
      setWorkingDraft(fetchedSubmission);
    }
  }, [fetchedSubmission]);

  const currentSubmission = workingDraft;

  const updateCurrentSubmission = useCallback((updates: Partial<SubmissionPayload>) => {
    if (!currentSubmission) return;
    if (currentSubmission.meta.locked === true) {
      toast.error('Locked record cannot be edited');
      return;
    }
    const updated = { ...currentSubmission, ...updates };
    updated.meta.updated_at = new Date().toISOString();
    setWorkingDraft(updated);
  }, [currentSubmission]);

  if (isLoading || !currentSubmission) {
    return <EditorSkeleton />;
  }

  const submissions = allSubmissions;

  const isLocked = isSubmissionLocked(currentSubmission);
  const isEditable = isSubmissionEditable(currentSubmission);
  const revisionNumber = currentSubmission.meta.revision_number ?? 1;

  const handleSaveDraft = async () => {
    if (isLocked) {
      toast.error('Locked record cannot be saved');
      return;
    }
    const saved = await saveDraftMutation.mutateAsync(currentSubmission);
    setWorkingDraft(saved);
    toast.success('Draft saved successfully');
  };

  const handleSubmit = async (changeKind?: ChangeKind, changeNote?: string) => {
    if (isLocked) {
      toast.error('Locked record cannot be submitted');
      return;
    }
    await submitMutation.mutateAsync({
      submission: currentSubmission,
      changeKind,
      changeNote,
    });
    toast.success('Submission submitted for review');
    navigate('/app/submissions');
  };

  // Find parent submission for revision context
  const parentSubmission = useMemo(() => {
    if (!currentSubmission?.meta.parent_submission_id) return null;
    return submissions.find(s => s.meta.submission_id === currentSubmission.meta.parent_submission_id) ?? null;
  }, [currentSubmission?.meta.parent_submission_id, submissions]);



  const handleImportClick = () => {
    if (isLocked) {
      toast.error('Locked record cannot be modified');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const updates = processImportedJson(content, currentSubmission);
        updateCurrentSubmission(updates);
        toast.success('JSON imported and migrated!');
      } catch (error) {
        toast.error('Failed to parse JSON file.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCreateRevision = async (changeKind: ChangeKind, changeNote: string) => {
    const newId = await revisionMutation.mutateAsync({
      parentSubmission: currentSubmission,
      changeKind,
      changeNote,
    });
    setShowRevisionModal(false);

    if (newId) {
      navigate(`/app/editor/${newId}`);
    }
  };

  const renderStep = () => {
    const stepProps = {
      submission: currentSubmission,
      onUpdate: updateCurrentSubmission,
      isEditable,
      setSelectedEntity
    };

    switch (currentStep) {
      case 1: return <ParcelStep {...stepProps} />;
      case 2: return <BuildingsStep {...stepProps} />;
      case 3: return <FloorsStep {...stepProps} />;
      case 4: return <ComponentsStep {...stepProps} />;
      case 5: return <RightsStep {...stepProps} />;
      case 6: return <ReviewStep {...stepProps} onSubmit={handleSubmit} parentSubmission={parentSubmission} onSaveDraft={handleSaveDraft} />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b border-[hsl(var(--panel-border))] bg-[hsl(var(--panel-header))] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/submissions')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <span className="font-semibold text-sm uppercase tracking-wide truncate max-w-[200px]">
            {currentSubmission.parcel.name || 'Untitled Submission'}
          </span>
          <StatusBadge status={currentSubmission.meta.status} size="sm" />
          {revisionNumber > 1 && (
            <Badge variant="outline" className="font-mono text-xs">Rev. #{revisionNumber}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop Toolbar */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowHistory(!showHistory); if (!showHistory) setShowJson(false); }}>
              <History className="w-4 h-4 mr-1" /> History
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowJson(!showJson); if (!showJson) setShowHistory(false); }}>
              {showJson ? 'Hide' : 'Show'} JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowViewer(!showViewer)}>
              {showViewer ? 'Hide' : 'Show'} 3D View
            </Button>
            {isEditable && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json,application/json" className="hidden" />
                <Button variant="outline" size="sm" onClick={handleImportClick}>
                  <Upload className="w-4 h-4 mr-1" /> Import JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                  <Save className="w-4 h-4 mr-1" /> Save Draft
                </Button>
              </>
            )}

            {currentSubmission.meta.status === 'APPROVED' && (
              <Button size="sm" onClick={() => setShowRevisionModal(true)}>
                <GitBranch className="w-4 h-4 mr-1" /> Create Revision
              </Button>
            )}
          </div>

          {/* Mobile Toolbar */}
          <div className="flex md:hidden">
            <input type="file" ref={fileInputRef} onChange={handleImportJson} accept=".json,application/json" className="hidden" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { setShowHistory(!showHistory); if (!showHistory) setShowJson(false); }}>
                  <History className="w-4 h-4 mr-2" /> {showHistory ? 'Hide' : 'Show'} History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setShowJson(!showJson); if (!showJson) setShowHistory(false); }}>
                  <span className="w-4 h-4 mr-2 flex items-center justify-center font-mono text-[10px]">{"{}"}</span> {showJson ? 'Hide' : 'Show'} JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowViewer(!showViewer)}>
                  <span className="w-4 h-4 mr-2 flex items-center justify-center">👀</span> {showViewer ? 'Hide' : 'Show'} 3D View
                </DropdownMenuItem>
                
                {isEditable && (
                  <>
                    <DropdownMenuItem onClick={handleImportClick}>
                      <Upload className="w-4 h-4 mr-2" /> Import JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSaveDraft}>
                      <Save className="w-4 h-4 mr-2" /> Save Draft
                    </DropdownMenuItem>
                  </>
                )}
                
                {currentSubmission.meta.status === 'APPROVED' && (
                  <DropdownMenuItem onClick={() => setShowRevisionModal(true)}>
                    <GitBranch className="w-4 h-4 mr-2" /> Create Revision
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <RevisionInfoBanner submission={currentSubmission} onCreateRevision={() => setShowRevisionModal(true)} />

      <div className="flex-1 flex overflow-hidden">
        <div className="wizard-nav flex-shrink-0 overflow-y-auto custom-scrollbar">
          <WizardStepper steps={STEPS} currentStep={currentStep} onStepChange={setCurrentStep} />
        </div>

        <div className="wizard-content flex-1 overflow-y-auto custom-scrollbar">
          {showViewer ? (
            <div className="h-full"><Viewer3D submission={currentSubmission} onSelect={setSelectedEntity} /></div>
          ) : (
            renderStep()
          )}
        </div>

        <div className="wizard-inspector flex-shrink-0 overflow-y-auto custom-scrollbar">
          {showHistory ? (
            <div className="p-4"><RevisionHistoryPanel currentSubmission={currentSubmission} allSubmissions={submissions} onClose={() => setShowHistory(false)} /></div>
          ) : showJson ? (
            <JsonPanel submission={currentSubmission} />
          ) : (
            <InspectorPanel submission={currentSubmission} selectedEntity={selectedEntity} />
          )}
        </div>
      </div>

      <CreateRevisionModal open={showRevisionModal} onOpenChange={setShowRevisionModal} onConfirm={handleCreateRevision} parentSubmission={currentSubmission} />
    </div>
  );
};

export default EditorPage;
