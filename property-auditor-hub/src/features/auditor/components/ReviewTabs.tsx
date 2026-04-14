// ============================================
// REVIEW TABS - All tabs in one file for efficiency
// ============================================

import { DocumentViewer } from './DocumentViewer';

import { DocReviewStatus, DocumentRef, DocumentReview, GeometryCheckResults, OwnershipClaim, RequiredDocInfo, RightsCheckResults, Submission, SubmissionDiff } from '@udhbha/types';


// Lazy load the 3D viewer for performance
const Viewer3D = lazy(() => import('./Viewer3D'));

// ========== OVERVIEW TAB ==========
interface OverviewTabProps {
  submission: Submission;
  parent: Submission | null;
  detectedChangeKind: string;
}

export function OverviewTab({ submission, parent, detectedChangeKind }: OverviewTabProps) {
  const meta = submission.meta;
  const mismatch = meta.change_kind !== 'AUTO' && meta.change_kind !== detectedChangeKind;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Submission Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono">{meta.submission_id}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={meta.status} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created By</span><span>{meta.created_by}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{format(new Date(meta.created_at), 'PPpp')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Change Kind</span><ChangeKindBadge kind={meta.change_kind} /></div>
            {mismatch && (
              <div className="p-3 bg-[hsl(var(--warning-bg))] border border-[hsl(var(--warning-border))] rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[hsl(var(--audit-warn))]" />
                <span className="text-sm">Detected change kind: <strong>{detectedChangeKind}</strong></span>
              </div>
            )}
          </CardContent>
        </Card>
        {parent && (
          <Card>
            <CardHeader><CardTitle className="text-base">Parent Submission</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono">{parent.meta.submission_id}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={parent.meta.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Revision</span><span>#{parent.meta.revision_number}</span></div>
            </CardContent>
          </Card>
        )}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Event Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-2xl font-bold">{submission.topology_events.length}</div>
              <div className="text-sm text-muted-foreground">Topology Events</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-2xl font-bold">{submission.rights_events.filter(e => e.draft_state !== 'UNDONE').length}</div>
              <div className="text-sm text-muted-foreground">Rights Events</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-2xl font-bold">{Object.keys(submission.documents_index).length}</div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== DIFF TAB ==========
interface DiffTabProps { submission: Submission; parent: Submission | null; }

export function DiffTab({ submission, parent }: DiffTabProps) {
  const diff = computeDiff(parent, submission);
  const hasDiffs = diff.topology.length > 0 || diff.rights.length > 0 || diff.geometry.length > 0;

  if (!hasDiffs) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">No differences detected from parent submission.</CardContent></Card>;
  }

  return (
    <Accordion type="multiple" defaultValue={['topology', 'rights']} className="space-y-4">
      {diff.topology.length > 0 && (
        <AccordionItem value="topology" className="border rounded-lg px-4">
          <AccordionTrigger>Topology Changes ({diff.topology.length})</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {diff.topology.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge variant={item.action === 'ADDED' ? 'default' : item.action === 'REMOVED' ? 'destructive' : 'secondary'}>{item.action}</Badge>
                  <Badge variant="outline">{item.entity_type}</Badge>
                  <span className="font-medium">{item.label}</span>
                  {item.details && <span className="text-sm text-muted-foreground">— {item.details}</span>}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
      {diff.rights.length > 0 && (
        <AccordionItem value="rights" className="border rounded-lg px-4">
          <AccordionTrigger>Rights Changes ({diff.rights.length})</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {diff.rights.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Badge variant={item.action === 'ADDED' ? 'default' : item.action === 'REMOVED' ? 'destructive' : 'secondary'}>{item.action}</Badge>
                  <span className="font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}

// ========== GEOMETRY TAB ==========
interface GeometryTabProps {
  submission: Submission;
  parent: Submission | null;
  checkResults: GeometryCheckResults | null;
  onRunChecks: () => GeometryCheckResults;
  checksRun: boolean;
}

export function GeometryTab({ submission, parent, checkResults, onRunChecks, checksRun }: GeometryTabProps) {
  const mergedGeometry = { ...(parent?.geometry_store || {}), ...submission.geometry_store };
  
  // Merge parcel data - get anchors from parent if not in submission
  const mergedParcel = useMemo(() => {
    const subParcel = submission.parcel;
    const parentParcel = parent?.parcel;
    
    return {
      ...parentParcel,
      ...subParcel,
      // Make sure anchors are available from parent if submission doesn't have them
      anchors: subParcel.anchors?.length ? subParcel.anchors : parentParcel?.anchors || [],
      // Keep the parcel name if available
      name: subParcel.name || parentParcel?.name,
      ref_frame: subParcel.ref_frame || parentParcel?.ref_frame,
    };
  }, [submission.parcel, parent?.parcel]);

  return (
    <div className="space-y-4">
      <div className="h-[500px]">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center bg-muted rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <Viewer3D
            parcel={mergedParcel}
            buildings={submission.buildings}
            floors={submission.floors}
            components={submission.components}
            geometryStore={mergedGeometry}
          />
        </Suspense>
      </div>
      
      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Geometry Checks
                {checkResults && (
                  <StatusBadge status={checkResults.status} />
                )}
              </CardTitle>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onRunChecks(); }} className="gap-2">
                <Play className="w-4 h-4" />
                {checksRun ? 'Re-run' : 'Run Checks'}
              </Button>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-t-0 rounded-t-none">
            <CardContent className="pt-4">
              {checkResults ? (
                <div className="space-y-2">
                  {checkResults.results.map((r, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-2 rounded border",
                      r.status === 'PASS' && "check-passed",
                      r.status === 'FAIL' && "check-failed",
                      r.status === 'WARN' && "check-warning"
                    )}>
                      <StatusBadge status={r.status} />
                      <span className="text-sm">{r.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Click "Run Checks" to validate geometry.</p>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ========== RIGHTS TAB ==========
interface RightsTabProps {
  submission: Submission;
  parent: Submission | null;
  checkResults: RightsCheckResults | null;
  onRunChecks: () => RightsCheckResults;
  checksRun: boolean;
}

export function RightsTab({ submission, parent, checkResults, onRunChecks, checksRun }: RightsTabProps) {
  const ownership = computeOwnership(parent?.rights_events || [], submission.rights_events);
  const active = ownership.filter(o => o.active);
  const ended = ownership.filter(o => !o.active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Current Ownership ({active.length})</CardTitle></CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active ownership claims.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {active.map((claim, i) => (
                <div key={i} className="p-3 border rounded-lg" style={{ borderLeftColor: '#FF7A00', borderLeftWidth: '3px' }}>
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-[#FF7A00]" /><span className="font-mono text-sm">{claim.holder}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Unit: {claim.target_id} • Share: {claim.share * 100}%</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {ended.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-muted-foreground">Ended Ownership ({ended.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 opacity-60">
              {ended.map((claim, i) => (
                <div key={i} className="p-3 border rounded-lg border-dashed">
                  <div className="flex items-center gap-2"><User className="w-4 h-4" /><span className="font-mono text-sm line-through">{claim.holder}</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Unit: {claim.target_id}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Rights Checks</CardTitle>
          <Button size="sm" onClick={onRunChecks} className="gap-2">
            <Play className="w-4 h-4" />
            {checksRun ? 'Re-run Checks' : 'Run Checks'}
          </Button>
        </CardHeader>
        <CardContent>
          {checkResults ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Overall:</span>
                <StatusBadge status={checkResults.status} />
              </div>
              {checkResults.results.map((r, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-3 p-2 rounded border",
                  r.status === 'PASS' && "check-passed",
                  r.status === 'FAIL' && "check-failed",
                  r.status === 'WARN' && "check-warning"
                )}>
                  <StatusBadge status={r.status} />
                  <span className="text-sm">{r.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Click "Run Checks" to validate rights.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========== DOCUMENTS TAB ==========
// Re-export for backwards compatibility
export { DocumentsReviewTable } from '../../shared/docs/DocumentsReviewTable';

interface DocumentsTabProps {
  submission: Submission;
  allDocs: DocumentRef[];
  documentsIndex: Record<string, any>;
  reviews: DocumentReview[];
  requiredDocs: RequiredDocInfo[];
  onUpdateReview: (review: DocumentReview) => void;
  onRunDocChecks: () => void;
  docChecksRun: boolean;
  onNavigate?: (tabName: 'Overview' | 'Diff' | 'Geometry' | 'Rights' | 'Documents') => void;
  onHighlight?: (entity: { kind: 'FLOOR' | 'COMPONENT'; id: string }) => void;
  onFocusEvent?: (eventId: string) => void;
}

export function DocumentsTab({ 
  submission,
  allDocs, 
  documentsIndex, 
  reviews, 
  requiredDocs, 
  onUpdateReview, 
  onRunDocChecks, 
  docChecksRun,
  onNavigate,
  onHighlight,
  onFocusEvent,
}: DocumentsTabProps) {
  return (
    <DocumentsReviewTable
      submission={submission}
      allDocs={allDocs}
      documentsIndex={documentsIndex}
      reviews={reviews}
      requiredDocs={requiredDocs}
      editable={true}
      onUpdateReview={onUpdateReview}
      onRunDocChecks={onRunDocChecks}
      docChecksRun={docChecksRun}
      onNavigate={onNavigate}
      onHighlight={onHighlight}
      onFocusEvent={onFocusEvent}
    />
  );
}

// ========== RAW JSON TAB ==========
interface RawJsonTabProps { submission: Submission; parent: Submission | null; }

export function RawJsonTab({ submission, parent }: RawJsonTabProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(JSON.stringify(submission, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Raw Submission JSON</CardTitle>
        <Button variant="outline" size="sm" onClick={copy} className="gap-2">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied!' : 'Copy'}</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <pre className="json-viewer">{JSON.stringify(submission, null, 2)}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ========== NOTES PANEL ==========
interface NotesPanelProps {
  publicNote: string;
  internalNote: string;
  onUpdateNotes: (notes: { public?: string; internal?: string }) => void;
}

export function NotesPanel({ publicNote, internalNote, onUpdateNotes }: NotesPanelProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Audit Notes</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="form-label">Public Note (visible to surveyor)</Label>
          <Textarea value={publicNote} onChange={(e) => onUpdateNotes({ public: e.target.value })} placeholder="Add notes for the surveyor..." className="mt-1.5" />
        </div>
        <div>
          <Label className="form-label">Internal Note (auditor only)</Label>
          <Textarea value={internalNote} onChange={(e) => onUpdateNotes({ internal: e.target.value })} placeholder="Add internal notes..." className="mt-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
