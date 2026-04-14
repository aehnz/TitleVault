// ============================================
// PUBLIC DOCUMENTS TABLE
// Read-only document list with provenance
// ============================================

import { ScrollArea } from '@/components/ui/scroll-area';

import { AuditReport, DocumentRef, Submission } from '@udhbha/types';


interface PublicDocumentsTableProps {
  submission: Submission;
  parent: Submission | null;
  auditReport: AuditReport | null;
}

export function PublicDocumentsTable({
  submission,
  parent,
  auditReport,
}: PublicDocumentsTableProps) {
  const [viewingDoc, setViewingDoc] = useState<DocumentRef | null>(null);

  const allDocs = useMemo(() => {
    return aggregateDocuments(parent, submission);
  }, [parent, submission]);

  const docAttachments = useMemo(() => {
    return buildDocAttachmentIndex(submission);
  }, [submission]);

  const mergedDocsIndex = useMemo(() => {
    return {
      ...(parent?.documents_index || {}),
      ...submission.documents_index,
    };
  }, [parent, submission]);

  const getDocStatus = (docId: string): string | null => {
    if (!auditReport) return null;
    const result = auditReport.checks.documents.doc_results.find(r => r.doc_id === docId);
    return result?.status || null;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    switch (status) {
      case 'VALID':
        return <Badge className="bg-[hsl(var(--audit-pass))] text-xs">Verified</Badge>;
      case 'MISSING':
        return <Badge variant="destructive" className="text-xs">Missing</Badge>;
      case 'ILLEGIBLE':
        return <Badge variant="destructive" className="text-xs">Illegible</Badge>;
      case 'MISMATCH':
        return <Badge variant="destructive" className="text-xs">Mismatch</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getAttachmentChips = (docId: string): AttachmentRef[] => {
    return docAttachments[docId] || [];
  };

  const formatAttachmentType = (ref: AttachmentRef): string => {
    switch (ref.kind) {
      case 'PARCEL': return `Parcel`;
      case 'BUILDING': return `Bldg`;
      case 'FLOOR': return `Floor`;
      case 'COMPONENT': return `Unit`;
      case 'RIGHTS_EVENT': return `Rights`;
      case 'TOPOLOGY_EVENT': return `Topology`;
      default: return 'Other';
    }
  };

  const getAttachmentId = (ref: AttachmentRef): string => {
    switch (ref.kind) {
      case 'PARCEL': return ref.parcel_id;
      case 'BUILDING': return ref.building_id;
      case 'FLOOR': return ref.floor_id;
      case 'COMPONENT': return ref.component_id;
      case 'RIGHTS_EVENT': return ref.event_id;
      case 'TOPOLOGY_EVENT': return ref.event_id;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents ({allDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Attached To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No documents attached to this submission.
                    </TableCell>
                  </TableRow>
                ) : (
                  allDocs.map((doc) => {
                    const attachments = getAttachmentChips(doc.id);
                    const status = getDocStatus(doc.id);
                    
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            {doc.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {doc.type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {attachments.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">
                                Not linked
                              </span>
                            ) : (
                              attachments.slice(0, 3).map((ref, idx) => (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-xs cursor-help">
                                      <Paperclip className="w-3 h-3 mr-1" />
                                      {formatAttachmentType(ref)}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {ref.kind}: {getAttachmentId(ref)}
                                  </TooltipContent>
                                </Tooltip>
                              ))
                            )}
                            {attachments.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{attachments.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingDoc(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.name}</DialogTitle>
          </DialogHeader>
          {viewingDoc && (
            <DocumentViewer
              document={viewingDoc}
              documentEntry={mergedDocsIndex[viewingDoc.id]}
              onClose={() => setViewingDoc(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
