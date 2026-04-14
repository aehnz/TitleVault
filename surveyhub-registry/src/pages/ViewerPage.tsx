import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSubmission, useSubmissionList, useCreateRevision } from '@/hooks/useSubmissions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { ArrowLeft, Download, GitBranch, History } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import Viewer3D from '@/components/viewer/Viewer3D';
import JsonPanel from '@/components/editor/JsonPanel';
import RevisionInfoBanner from '@/components/revision/RevisionInfoBanner';
import RevisionHistoryPanel from '@/components/revision/RevisionHistoryPanel';
import CreateRevisionModal from '@/components/revision/CreateRevisionModal';
import { ChangeKind } from '@udhbha/types';


const ViewerPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { data: currentSubmission, isLoading } = useSubmission(submissionId);
  const { data: submissions = [] } = useSubmissionList();
  const revisionMutation = useCreateRevision();
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading || !currentSubmission) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading submission…</div>
      </div>
    );
  }

  const handleExport = () => {
    const jsonString = JSON.stringify(currentSubmission, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSubmission.meta.submission_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('JSON exported');
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

  const revisionNumber = currentSubmission.meta.revision_number ?? 1;

  return (
    <div className="h-full flex flex-col">
      {/* Header - government style */}
      <div className="h-12 border-b border-[hsl(var(--panel-border))] bg-[hsl(var(--panel-header))] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/submissions')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <span className="font-semibold text-sm uppercase tracking-wide">
            {currentSubmission.parcel.name || 'Untitled'}
          </span>
          <StatusBadge status={currentSubmission.meta.status} size="sm" />
          {revisionNumber > 1 && (
            <Badge variant="outline" className="font-mono text-xs">
              Rev. #{revisionNumber}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="toolbar-btn gap-1"
          >
            <History className="w-4 h-4" />
            History
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="toolbar-btn gap-1">
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
          {currentSubmission.meta.status === 'APPROVED' && (
            <Button size="sm" onClick={() => setShowRevisionModal(true)} className="gap-1">
              <GitBranch className="w-4 h-4" />
              Create Revision
            </Button>
          )}
        </div>
      </div>

      {/* Revision Banner */}
      <RevisionInfoBanner
        submission={currentSubmission}
        onCreateRevision={() => setShowRevisionModal(true)}
        showCreateButton={false} // Already have button in header
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewer */}
        <div className="flex-1 flex flex-col">
          <Viewer3D submission={currentSubmission} />
        </div>

        {/* Right Panel - JSON or History */}
        <div className="w-96 border-l border-[hsl(var(--panel-border))] bg-card p-4 overflow-auto custom-scrollbar">
          {showHistory ? (
            <RevisionHistoryPanel
              currentSubmission={currentSubmission}
              allSubmissions={submissions}
              onClose={() => setShowHistory(false)}
            />
          ) : (
            <JsonPanel submission={currentSubmission} />
          )}
        </div>
      </div>

      {/* Create Revision Modal */}
      <CreateRevisionModal
        open={showRevisionModal}
        onOpenChange={setShowRevisionModal}
        onConfirm={handleCreateRevision}
        parentSubmission={currentSubmission}
      />
    </div>
  );
};

export default ViewerPage;
