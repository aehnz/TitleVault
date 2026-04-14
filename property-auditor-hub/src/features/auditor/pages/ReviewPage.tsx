// ============================================
// REVIEW PAGE
// Main audit review interface with run all checks
// ============================================

import { toast } from 'sonner';

export function ReviewPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { submission, parent, isLoading, error } = useSubmission(submissionId || '');

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Submission Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'The requested submission could not be loaded.'}</p>
          <Button onClick={() => navigate('/auditor/inbox')}>Back to Inbox</Button>
        </div>
      </div>
    );
  }

  return <ReviewPageContent submission={submission} parent={parent} />;
}

function ReviewPageContent({ submission, parent }: { submission: any; parent: any }) {
  const navigate = useNavigate();
  const audit = useAuditState({ submission, parent });
  const settings = getAuditorSettings();
  const [copiedJson, setCopiedJson] = useState<'parent' | 'submission' | 'report' | null>(null);

  const handleRunAllChecks = () => {
    audit.runAllChecks();
    toast.success('All checks completed');
  };

  const copyJson = (type: 'parent' | 'submission' | 'report', data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(type);
    setTimeout(() => setCopiedJson(null), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <>
      <AuditorHeader
        title={`Review: ${submission.meta.submission_id}`}
        subtitle={submission.parcel.name || submission.parcel.parcel_id}
      />
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-7xl mx-auto p-6">
          {/* Top action bar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/auditor/inbox')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />Back to Inbox
            </Button>
            
            <div className="flex items-center gap-3">
              {/* Check status badges */}
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded border ${audit.state.geometryChecksRun ? 'check-passed border' : 'check-not-run'}`}>
                  Geometry {audit.state.geometryChecksRun ? '✓' : '○'}
                </span>
                <span className={`px-2 py-1 rounded border ${audit.state.rightsChecksRun ? 'check-passed border' : 'check-not-run'}`}>
                  Rights {audit.state.rightsChecksRun ? '✓' : '○'}
                </span>
                <span className={`px-2 py-1 rounded border ${audit.state.docChecksRun ? 'check-passed border' : 'check-not-run'}`}>
                  Docs {audit.state.docChecksRun ? '✓' : '○'}
                </span>
              </div>
              
              <Button 
                onClick={handleRunAllChecks} 
                className="gap-2 toolbar-btn success"
                disabled={audit.allChecksRun}
              >
                <PlayCircle className="w-4 h-4" />
                {audit.allChecksRun ? 'All Checks Complete' : 'Run All Checks'}
              </Button>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="diff">Diff</TabsTrigger>
                  <TabsTrigger value="geometry">Geometry</TabsTrigger>
                  <TabsTrigger value="rights">Rights</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="json">Raw JSON</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <OverviewTab submission={submission} parent={parent} detectedChangeKind={audit.detectedChangeKind} />
                </TabsContent>
                <TabsContent value="diff">
                  <DiffTab submission={submission} parent={parent} />
                </TabsContent>
                <TabsContent value="geometry">
                  <GeometryTab 
                    submission={submission} 
                    parent={parent} 
                    checkResults={audit.state.geometry_check_results} 
                    onRunChecks={audit.runGeometryChecks}
                    checksRun={audit.state.geometryChecksRun}
                  />
                </TabsContent>
                <TabsContent value="rights">
                  <RightsTab 
                    submission={submission} 
                    parent={parent} 
                    checkResults={audit.state.rights_check_results} 
                    onRunChecks={audit.runRightsChecks}
                    checksRun={audit.state.rightsChecksRun}
                  />
                </TabsContent>
                <TabsContent value="documents">
                  <DocumentsTab 
                    submission={submission}
                    allDocs={audit.allDocs} 
                    documentsIndex={{ ...parent?.documents_index, ...submission.documents_index }} 
                    reviews={audit.state.document_reviews} 
                    requiredDocs={audit.requiredDocs}
                    onUpdateReview={audit.updateDocumentReview}
                    onRunDocChecks={audit.runDocChecks}
                    docChecksRun={audit.state.docChecksRun}
                  />
                </TabsContent>
                <TabsContent value="json">
                  <RawJsonTab submission={submission} parent={parent} />
                </TabsContent>
              </Tabs>

              <div className="mt-6">
                <NotesPanel publicNote={audit.state.notes.public} internalNote={audit.state.notes.internal} onUpdateNotes={audit.updateNotes} />
              </div>

              {/* Raw Evidence Accordion */}
              <div className="mt-6">
                <Accordion type="single" collapsible className="border rounded-lg">
                  <AccordionItem value="evidence" className="border-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="w-4 h-4" />
                        <span className="font-semibold text-sm uppercase tracking-wide">Raw Evidence</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4">
                        {parent && (
                          <Card>
                            <CardHeader className="py-2 flex flex-row items-center justify-between">
                              <CardTitle className="text-sm">Parent Submission</CardTitle>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyJson('parent', parent)}
                                className="gap-1 h-7"
                              >
                                {copiedJson === 'parent' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                Copy
                              </Button>
                            </CardHeader>
                            <CardContent className="py-2">
                              <ScrollArea className="h-[200px]">
                                <pre className="json-viewer text-xs">{JSON.stringify(parent, null, 2)}</pre>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        )}
                        
                        <Card>
                          <CardHeader className="py-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm">Current Submission</CardTitle>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyJson('submission', submission)}
                              className="gap-1 h-7"
                            >
                              {copiedJson === 'submission' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              Copy
                            </Button>
                          </CardHeader>
                          <CardContent className="py-2">
                            <ScrollArea className="h-[200px]">
                              <pre className="json-viewer text-xs">{JSON.stringify(submission, null, 2)}</pre>
                            </ScrollArea>
                          </CardContent>
                        </Card>

                        {audit.state.decision && (
                          <Card>
                            <CardHeader className="py-2 flex flex-row items-center justify-between">
                              <CardTitle className="text-sm">Audit Report Preview</CardTitle>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyJson('report', audit.generateReport())}
                                className="gap-1 h-7"
                              >
                                {copiedJson === 'report' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                Copy
                              </Button>
                            </CardHeader>
                            <CardContent className="py-2">
                              <ScrollArea className="h-[200px]">
                                <pre className="json-viewer text-xs">{JSON.stringify(audit.generateReport(), null, 2)}</pre>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>

            {/* Summary sidebar */}
            <div className="w-72 flex-shrink-0">
              <SummaryPanel
                submission={submission}
                parent={parent}
                detectedChangeKind={audit.detectedChangeKind}
                reasons={audit.state.reasons}
                geometryResults={audit.state.geometry_check_results}
                rightsResults={audit.state.rights_check_results}
                docResults={audit.state.document_check_results}
                docCount={audit.allDocs.length}
                checksRun={{
                  geometry: audit.state.geometryChecksRun,
                  rights: audit.state.rightsChecksRun,
                  docs: audit.state.docChecksRun,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <DecisionBar
        decision={audit.state.decision}
        decisionGate={audit.decisionGate}
        overrideEnabled={audit.state.override_enabled}
        reasonCount={audit.allReasons.length}
        reasons={audit.allReasons}
        onDecisionChange={audit.setDecision}
        onToggleOverride={audit.toggleOverride}
        onSubmit={audit.submitDecision}
        isSubmitting={audit.isSubmitting}
        showDebug={true}
      />
    </>
  );
}
