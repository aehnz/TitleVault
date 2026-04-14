// ============================================
// REGISTRAR REVIEW PAGE
// Review submission with chain anchoring
// ============================================

import { 
  ArrowLeft, Play, Copy, Check, AlertTriangle, Loader2, 
  Link as LinkIcon, FileText, Eye, Hash, Globe 
} from 'lucide-react';
import { AuditRepo } from '../../auditor/repos/AuditRepo';

import { aggregateDocuments, computeRequiredDocsEnhanced } from '../../auditor/validators/validateDocs';

// Import auditor review tabs for reuse (read-only)
import { AuditReport, Submission } from '@udhbha/types';


export function ReviewPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [parent, setParent] = useState<Submission | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!submissionId) {
        setError('No submission ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const sub = await SubmissionRepo.getById(submissionId);
        if (!sub) {
          setError('Submission not found');
          setIsLoading(false);
          return;
        }
        setSubmission(sub);

        if (sub.meta.parent_submission_id) {
          const parentSub = await SubmissionRepo.getById(sub.meta.parent_submission_id);
          setParent(parentSub);
        }

        const report = await AuditRepo.getBySubmissionId(submissionId);
        if (!report) {
          setError('Audit report not found. Cannot proceed without audit.');
          setIsLoading(false);
          return;
        }
        setAuditReport(report);

        setIsLoading(false);
      } catch (err) {
        setError('Failed to load submission data');
        setIsLoading(false);
      }
    };

    load();
  }, [submissionId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !submission || !auditReport) {
    return (
      <>
        <RegistrarHeader title="Review Error" />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Cannot Open Review</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/registrar/inbox')}>
                Back to Inbox
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <ReviewPageContent 
      submission={submission} 
      parent={parent} 
      auditReport={auditReport} 
    />
  );
}

interface ReviewPageContentProps {
  submission: Submission;
  parent: Submission | null;
  auditReport: AuditReport;
}

function ReviewPageContent({ submission, parent, auditReport }: ReviewPageContentProps) {
  const navigate = useNavigate();
  const registrar = useRegistrarState({ submission, parent, auditReport });
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const copyJson = (label: string, data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  // Navigation handler for document attachment dialog
  const handleNavigate = (tabName: 'Overview' | 'Diff' | 'Geometry' | 'Rights' | 'Documents') => {
    const tabMap: Record<string, string> = {
      Overview: 'overview',
      Diff: 'diff',
      Geometry: 'geometry',
      Rights: 'rights',
      Documents: 'documents',
    };
    setActiveTab(tabMap[tabName] || 'overview');
  };

  // Use shared aggregateDocuments for consistent document collection
  const allDocs = useMemo(
    () => aggregateDocuments(parent, submission),
    [parent, submission]
  );

  // Merge documents_index from both parent and submission
  const mergedDocumentsIndex = useMemo(
    () => ({ ...(parent?.documents_index || {}), ...(submission.documents_index || {}) }),
    [parent, submission]
  );

  // Compute required docs for proper badge display
  const requiredDocs = useMemo(
    () => computeRequiredDocsEnhanced(submission),
    [submission]
  );

  return (
    <div className="flex flex-col h-screen">
      <RegistrarHeader 
        title={`Review: ${submission.meta.submission_id}`}
        subtitle={`Parcel: ${submission.parcel.name || submission.parcel.parcel_id}`}
      />
      
      {/* Top action bar */}
      <div className="px-6 py-3 border-b bg-muted/30 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/registrar/inbox')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </Button>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <FileText className="w-3 h-3" />
            Rev #{submission.meta.revision_number}
          </Badge>
          <Badge className={auditReport.decision === 'PASS' ? 'status-pass' : 'status-warn'}>
            Audit: {auditReport.decision}
          </Badge>
          {registrar.state.chain_anchor && (
            <Badge className="status-pass gap-1">
              <LinkIcon className="w-3 h-3" />
              Anchored
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-8 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="diff">Diff</TabsTrigger>
              <TabsTrigger value="geometry">Geometry</TabsTrigger>
              <TabsTrigger value="rights">Rights</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="chain">Chain</TabsTrigger>
              <TabsTrigger value="transparency">Transparency</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab 
                submission={submission} 
                parent={parent} 
                detectedChangeKind={auditReport.change_kind_detected}
              />
              {/* Audit Summary Card */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Audit Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Auditor:</span>
                      <span className="ml-2 font-medium">{auditReport.auditor_id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Audited:</span>
                      <span className="ml-2">{format(new Date(auditReport.audited_at), 'PPpp')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Decision:</span>
                      <Badge className={`ml-2 ${auditReport.decision === 'PASS' ? 'status-pass' : 'status-fail'}`}>
                        {auditReport.decision}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Checks Failed:</span>
                      <span className="ml-2">{auditReport.summary.checks_failed}</span>
                    </div>
                  </div>
                  {auditReport.notes.public && (
                    <div className="pt-3 border-t">
                      <Label className="text-xs text-muted-foreground">Auditor Notes (Public)</Label>
                      <p className="mt-1 text-sm">{auditReport.notes.public}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diff">
              <DiffTab submission={submission} parent={parent} />
            </TabsContent>

            <TabsContent value="geometry">
              <GeometryTab
                submission={submission}
                parent={parent}
                checkResults={auditReport.checks.geometry}
                onRunChecks={() => auditReport.checks.geometry}
                checksRun={true}
              />
            </TabsContent>

            <TabsContent value="rights">
              <RightsTab
                submission={submission}
                parent={parent}
                checkResults={auditReport.checks.rights}
                onRunChecks={() => auditReport.checks.rights}
                checksRun={true}
              />
            </TabsContent>

            <TabsContent value="documents">
              <DocumentsReviewTable
                submission={submission}
                allDocs={allDocs}
                documentsIndex={mergedDocumentsIndex}
                reviews={auditReport.checks.documents.doc_results.map(d => ({
                  doc_id: d.doc_id,
                  status: d.status,
                  comment: d.comment,
                  reviewed_at: auditReport.audited_at,
                }))}
                requiredDocs={requiredDocs}
                editable={false}
                onNavigate={handleNavigate}
              />
            </TabsContent>

            <TabsContent value="chain">
              <ChainTab
                submission={submission}
                parent={parent}
                auditReport={auditReport}
                hashes={registrar.state.hashes}
                chainAnchor={registrar.state.chain_anchor}
                onComputeHashes={registrar.computeHashes}
                onAnchor={registrar.anchorOnChain}
              />
            </TabsContent>

            <TabsContent value="transparency">
              <TransparencyTab
                submission={submission}
                parent={parent}
                auditReport={auditReport}
                registrarState={registrar.state}
                onGenerateBundle={registrar.generateTransparencyBundle}
              />
            </TabsContent>

            <TabsContent value="raw">
              <RawJsonTab submission={submission} parent={parent} />
              {/* Additional audit report JSON */}
              <Card className="mt-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Audit Report JSON</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyJson('Audit Report', auditReport)}
                    className="gap-2"
                  >
                    {copied === 'Audit Report' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    Copy
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <pre className="json-viewer text-xs">
                      {JSON.stringify(auditReport, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="w-80 border-l overflow-auto p-4">
          <RegistrarSummaryPanel
            submission={submission}
            auditReport={auditReport}
            registrarState={registrar.state}
          />
          
          <Separator className="my-4" />
          
          {/* Notes Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Registrar Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Public Note</Label>
                <Textarea
                  placeholder="Note visible to submitter..."
                  value={registrar.state.notes.public}
                  onChange={(e) => registrar.updateNotes({ public: e.target.value })}
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Internal Note</Label>
                <Textarea
                  placeholder="Internal note (not shared)..."
                  value={registrar.state.notes.internal}
                  onChange={(e) => registrar.updateNotes({ internal: e.target.value })}
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Decision bar */}
      <RegistrarDecisionBar
        decision={registrar.state.decision}
        decisionGate={registrar.decisionGate}
        reasons={registrar.state.reasons}
        chainAnchor={registrar.state.chain_anchor}
        onDecisionChange={registrar.setDecision}
        onAddReason={registrar.addReason}
        onRemoveReason={registrar.removeReason}
        onSubmit={registrar.submitDecision}
        isSubmitting={registrar.isSubmitting}
      />
    </div>
  );
}
