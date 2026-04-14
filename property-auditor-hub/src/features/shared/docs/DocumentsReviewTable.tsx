// ============================================
// DOCUMENTS REVIEW TABLE
// Shared component for document review with Attached To column
// Reusable by both Auditor (editable) and Registrar (read-only)
// ============================================

import { DocAttachmentDialog } from './DocAttachmentDialog';

import {
  buildDocAttachmentIndex,
  AttachmentRef,
  DocAttachmentIndex,
  getAttachmentShortLabel,
  getAttachmentTooltip,
} from './docAttachmentIndex';
import { DocReviewStatus, DocumentEntry, DocumentRef, DocumentReview, RequiredDocInfo, Submission } from '@udhbha/types';


export interface DocumentsReviewTableProps {
  submission: Submission;
  allDocs: DocumentRef[];
  documentsIndex: Record<string, DocumentEntry>;
  reviews: DocumentReview[];
  requiredDocs: RequiredDocInfo[];
  // Editing mode: if false, status/comment are read-only
  editable?: boolean;
  onUpdateReview?: (review: DocumentReview) => void;
  onRunDocChecks?: () => void;
  docChecksRun?: boolean;
  // Navigation callbacks for dialog deep-linking
  onNavigate?: (tabName: 'Overview' | 'Diff' | 'Geometry' | 'Rights' | 'Documents') => void;
  onHighlight?: (entity: { kind: 'FLOOR' | 'COMPONENT'; id: string }) => void;
  onFocusEvent?: (eventId: string) => void;
}

function AttachmentChips({
  attachments,
  onClick,
}: {
  attachments: AttachmentRef[];
  onClick: () => void;
}) {
  if (attachments.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="cursor-pointer text-muted-foreground gap-1"
              onClick={onClick}
            >
              <Unlink className="w-3 h-3" />
              Unlinked
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Not referenced by any entity</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const displayChips = attachments.slice(0, 2);
  const remaining = attachments.length - 2;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {displayChips.map((ref, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted text-xs gap-1"
                onClick={onClick}
              >
                <Link2 className="w-3 h-3" />
                {getAttachmentShortLabel(ref)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getAttachmentTooltip(ref)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remaining > 0 && (
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-muted text-xs"
            onClick={onClick}
          >
            +{remaining} more
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

export function DocumentsReviewTable({
  submission,
  allDocs,
  documentsIndex,
  reviews,
  requiredDocs,
  editable = true,
  onUpdateReview,
  onRunDocChecks,
  docChecksRun,
  onNavigate,
  onHighlight,
  onFocusEvent,
}: DocumentsReviewTableProps) {
  const [viewingDoc, setViewingDoc] = useState<DocumentRef | null>(null);
  const [dialogDoc, setDialogDoc] = useState<DocumentRef | null>(null);

  // Build attachment index from submission
  const attachmentIndex: DocAttachmentIndex = useMemo(
    () => buildDocAttachmentIndex(submission),
    [submission]
  );

  const getReview = (id: string) => reviews.find((r) => r.doc_id === id);
  const isRequired = (id: string) => requiredDocs.some((r) => r.doc_id === id && r.found);
  const missingRequired = requiredDocs.filter((r) => !r.found);

  const handleOpenAttachmentDialog = (doc: DocumentRef) => {
    setDialogDoc(doc);
  };

  return (
    <div className="flex gap-4">
      <div className={cn('flex-1', viewingDoc && 'max-w-[60%]')}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Documents ({allDocs.length})</CardTitle>
            {editable && onRunDocChecks && (
              <Button size="sm" onClick={onRunDocChecks} className="gap-2">
                <Play className="w-4 h-4" />
                {docChecksRun ? 'Re-run Checks' : 'Run Checks'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {missingRequired.length > 0 && (
              <div className="mb-4 p-3 bg-[hsl(var(--error-bg))] border border-[hsl(var(--error-border))] rounded-lg">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Missing Required Documents
                </div>
                <ul className="text-sm space-y-1">
                  {missingRequired.map((r, i) => (
                    <li key={i} className="text-muted-foreground">
                      • {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Attached To</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDocs.map((doc) => {
                  const review = getReview(doc.id);
                  const required = isRequired(doc.id);
                  const status = review?.status || 'PENDING';
                  const hasIssue =
                    required &&
                    (status === 'MISSING' || status === 'ILLEGIBLE' || status === 'MISMATCH');
                  const attachments = attachmentIndex[doc.id] || [];

                  return (
                    <TableRow key={doc.id} className={hasIssue ? 'bg-[hsl(var(--error-bg))]' : ''}>
                      <TableCell>
                        <div className="font-medium">{doc.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{doc.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <AttachmentChips
                          attachments={attachments}
                          onClick={() => handleOpenAttachmentDialog(doc)}
                        />
                      </TableCell>
                      <TableCell>
                        {required ? (
                          <span className="required-badge">Required</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editable && onUpdateReview ? (
                          <Select
                            value={status}
                            onValueChange={(v) =>
                              onUpdateReview({
                                doc_id: doc.id,
                                status: v as DocReviewStatus,
                                comment: review?.comment || '',
                                reviewed_at: new Date().toISOString(),
                              })
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                'w-28',
                                status === 'VALID' &&
                                  'border-[hsl(var(--audit-pass))] text-[hsl(var(--audit-pass))]',
                                (status === 'MISSING' ||
                                  status === 'ILLEGIBLE' ||
                                  status === 'MISMATCH') &&
                                  'border-destructive text-destructive'
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="VALID">Valid</SelectItem>
                              <SelectItem value="MISSING">Missing</SelectItem>
                              <SelectItem value="ILLEGIBLE">Illegible</SelectItem>
                              <SelectItem value="MISMATCH">Mismatch</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={status === 'VALID' ? 'default' : 'secondary'}
                            className={cn(
                              status === 'VALID' && 'bg-[hsl(var(--audit-pass))]',
                              (status === 'MISSING' ||
                                status === 'ILLEGIBLE' ||
                                status === 'MISMATCH') &&
                                'bg-destructive text-destructive-foreground'
                            )}
                          >
                            {status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {editable && onUpdateReview && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'h-8 w-8',
                                    review?.comment && 'text-primary'
                                  )}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="end">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Comment</p>
                                  <Textarea
                                    placeholder="Add comment..."
                                    value={review?.comment || ''}
                                    onChange={(e) =>
                                      onUpdateReview({
                                        doc_id: doc.id,
                                        status: review?.status || 'PENDING',
                                        comment: e.target.value,
                                        reviewed_at: new Date().toISOString(),
                                      })
                                    }
                                    className="min-h-[80px] text-sm"
                                  />
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingDoc(doc)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {viewingDoc && (
        <div className="w-[40%] min-w-[300px]">
          <DocumentViewer
            document={viewingDoc}
            documentEntry={documentsIndex[viewingDoc.id]}
            onClose={() => setViewingDoc(null)}
          />
        </div>
      )}

      {/* Attachment Dialog */}
      <DocAttachmentDialog
        open={!!dialogDoc}
        onOpenChange={(open) => !open && setDialogDoc(null)}
        document={dialogDoc}
        attachments={dialogDoc ? attachmentIndex[dialogDoc.id] || [] : []}
        isRequired={dialogDoc ? isRequired(dialogDoc.id) : false}
        reviewStatus={dialogDoc ? getReview(dialogDoc.id)?.status : undefined}
        reviewComment={dialogDoc ? getReview(dialogDoc.id)?.comment : undefined}
        onNavigate={onNavigate}
        onHighlight={onHighlight}
        onFocusEvent={onFocusEvent}
      />
    </div>
  );
}
