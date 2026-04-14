// ============================================
// DOC ATTACHMENT DIALOG
// Shows all attachments for a document with navigation actions
// ============================================

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  MapPin,
  Building2,
  Layers,
  Box,
  FileText,
  ArrowRight,
  Link2,
  ExternalLink,
} from 'lucide-react';
import { DocReviewStatus, DocumentRef } from '@udhbha/types';


export interface DocAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentRef | null;
  attachments: AttachmentRef[];
  isRequired?: boolean;
  reviewStatus?: DocReviewStatus;
  reviewComment?: string;
  // Navigation callbacks (optional - if not provided, buttons are disabled)
  onNavigate?: (tabName: 'Overview' | 'Diff' | 'Geometry' | 'Rights' | 'Documents') => void;
  onHighlight?: (entity: { kind: 'FLOOR' | 'COMPONENT'; id: string }) => void;
  onFocusEvent?: (eventId: string) => void;
}

function getAttachmentIcon(kind: AttachmentRef['kind']) {
  switch (kind) {
    case 'PARCEL':
      return <MapPin className="w-4 h-4" />;
    case 'BUILDING':
      return <Building2 className="w-4 h-4" />;
    case 'FLOOR':
      return <Layers className="w-4 h-4" />;
    case 'COMPONENT':
      return <Box className="w-4 h-4" />;
    case 'RIGHTS_EVENT':
      return <FileText className="w-4 h-4" />;
    case 'TOPOLOGY_EVENT':
      return <FileText className="w-4 h-4" />;
  }
}

function getAttachmentColor(kind: AttachmentRef['kind']): string {
  switch (kind) {
    case 'PARCEL':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'BUILDING':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'FLOOR':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'COMPONENT':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'RIGHTS_EVENT':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    case 'TOPOLOGY_EVENT':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
  }
}

export function DocAttachmentDialog({
  open,
  onOpenChange,
  document,
  attachments,
  isRequired,
  reviewStatus,
  reviewComment,
  onNavigate,
  onHighlight,
  onFocusEvent,
}: DocAttachmentDialogProps) {
  if (!document) return null;

  const handleNavigateAction = (ref: AttachmentRef) => {
    switch (ref.kind) {
      case 'PARCEL':
        onNavigate?.('Overview');
        break;
      case 'BUILDING':
        onNavigate?.('Geometry');
        break;
      case 'FLOOR':
        onNavigate?.('Geometry');
        if (onHighlight) {
          onHighlight({ kind: 'FLOOR', id: ref.floor_id });
        }
        break;
      case 'COMPONENT':
        onNavigate?.('Geometry');
        if (onHighlight) {
          onHighlight({ kind: 'COMPONENT', id: ref.component_id });
        }
        break;
      case 'RIGHTS_EVENT':
        onNavigate?.('Rights');
        if (onFocusEvent) {
          onFocusEvent(ref.event_id);
        }
        break;
      case 'TOPOLOGY_EVENT':
        onNavigate?.('Diff');
        if (onFocusEvent) {
          onFocusEvent(ref.event_id);
        }
        break;
    }
    onOpenChange(false);
  };

  const getNavigateButtonLabel = (ref: AttachmentRef): string => {
    switch (ref.kind) {
      case 'PARCEL':
        return 'Open Overview';
      case 'BUILDING':
      case 'FLOOR':
      case 'COMPONENT':
        return 'Open Geometry';
      case 'RIGHTS_EVENT':
        return 'Open Rights';
      case 'TOPOLOGY_EVENT':
        return 'Open Diff';
    }
  };

  const getEntityDetails = (ref: AttachmentRef): { primary: string; secondary: string } => {
    switch (ref.kind) {
      case 'PARCEL':
        return { primary: ref.label, secondary: ref.parcel_id };
      case 'BUILDING':
        return { primary: ref.label, secondary: ref.building_id };
      case 'FLOOR':
        return { primary: ref.label, secondary: ref.floor_id };
      case 'COMPONENT':
        return {
          primary: `${ref.label}${ref.type ? ` (${ref.type})` : ''}`,
          secondary: ref.component_id,
        };
      case 'RIGHTS_EVENT':
        return {
          primary: `${ref.event_kind}`,
          secondary: `${ref.target_level} → ${ref.target_id}`,
        };
      case 'TOPOLOGY_EVENT':
        return {
          primary: `${ref.event_kind}`,
          secondary: ref.target_entity ? `${ref.target_entity} → ${ref.target_id}` : ref.event_id,
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Document Attachments
          </DialogTitle>
          <DialogDescription>
            Attached in {attachments.length} {attachments.length === 1 ? 'place' : 'places'}
          </DialogDescription>
        </DialogHeader>

        {/* Document metadata */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{document.name}</span>
            <Badge variant="outline">{document.type}</Badge>
          </div>
          <div className="text-xs text-muted-foreground font-mono">{document.id}</div>
          <div className="flex items-center gap-2 mt-2">
            {isRequired && <Badge className="bg-[hsl(var(--audit-warn))] text-white">Required</Badge>}
            {reviewStatus && (
              <Badge
                variant={reviewStatus === 'VALID' ? 'default' : 'secondary'}
                className={
                  reviewStatus === 'VALID'
                    ? 'bg-[hsl(var(--audit-pass))]'
                    : reviewStatus === 'PENDING'
                    ? ''
                    : 'bg-destructive text-destructive-foreground'
                }
              >
                {reviewStatus}
              </Badge>
            )}
          </div>
          {reviewComment && (
            <div className="text-xs text-muted-foreground italic mt-1">"{reviewComment}"</div>
          )}
        </div>

        <Separator />

        {/* Attachment list */}
        {attachments.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Not Referenced</p>
            <p className="text-xs">
              This document is not attached to any entity in the submission.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {attachments.map((ref, index) => {
                const details = getEntityDetails(ref);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md flex-shrink-0 ${getAttachmentColor(ref.kind)}`}>
                        {getAttachmentIcon(ref.kind)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {ref.kind.replace('_', ' ')}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{details.primary}</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                          {details.secondary}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigateAction(ref)}
                      disabled={!onNavigate}
                      className="gap-1 text-xs flex-shrink-0 ml-2"
                    >
                      {getNavigateButtonLabel(ref)}
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
