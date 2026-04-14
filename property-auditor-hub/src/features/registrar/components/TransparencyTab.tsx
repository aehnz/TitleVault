// ============================================
// TRANSPARENCY TAB
// Public transparency bundle generation
// ============================================

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AuditReport, RegistrarState, Submission, TransparencyBundle } from '@udhbha/types';


interface TransparencyTabProps {
  submission: Submission;
  parent: Submission | null;
  auditReport: AuditReport;
  registrarState: RegistrarState;
  onGenerateBundle: (maskHolders: boolean, maskDocRefs: boolean) => TransparencyBundle;
}

export function TransparencyTab({ 
  submission, 
  parent, 
  auditReport, 
  registrarState,
  onGenerateBundle,
}: TransparencyTabProps) {
  const [maskHolders, setMaskHolders] = useState(true);
  const [maskDocRefs, setMaskDocRefs] = useState(true);
  const [bundle, setBundle] = useState<TransparencyBundle | null>(registrarState.transparency_bundle);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const newBundle = onGenerateBundle(maskHolders, maskDocRefs);
    setBundle(newBundle);
    toast.success('Transparency bundle generated');
  };

  const copyBundle = () => {
    if (bundle) {
      navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
      setCopied(true);
      toast.success('Bundle copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadBundle = () => {
    if (bundle) {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transparency_${submission.meta.submission_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Transparency Options
          </CardTitle>
          <CardDescription>
            Configure what information is included in the public bundle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label>Mask Holder IDs</Label>
                <p className="text-xs text-muted-foreground">Replace holder IDs with masked versions (e.g., did:user:a***i)</p>
              </div>
            </div>
            <Switch checked={maskHolders} onCheckedChange={setMaskHolders} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label>Hide Document Storage Refs</Label>
                <p className="text-xs text-muted-foreground">Only show document IDs, not storage references</p>
              </div>
            </div>
            <Switch checked={maskDocRefs} onCheckedChange={setMaskDocRefs} />
          </div>
          <Button onClick={handleGenerate} className="w-full gap-2">
            <FileJson className="w-4 h-4" />
            {bundle ? 'Regenerate Bundle' : 'Generate Transparency Bundle'}
          </Button>
        </CardContent>
      </Card>

      {/* Bundle Preview */}
      {bundle && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Transparency Bundle</CardTitle>
              <CardDescription className="font-mono text-xs">
                {bundle.transparency_bundle.public_id}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyBundle} className="gap-1">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={downloadBundle} className="gap-1">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview">Card Preview</TabsTrigger>
                <TabsTrigger value="json">JSON View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="mt-4">
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Parcel</span>
                      <span className="font-mono text-sm">{bundle.transparency_bundle.parcel_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Revision</span>
                      <Badge variant="outline">#{bundle.transparency_bundle.revision_number}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Audit Decision</span>
                      <Badge className="status-pass">{bundle.transparency_bundle.audit.decision}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Registrar Decision</span>
                      <Badge variant="secondary">{bundle.transparency_bundle.registrar.decision}</Badge>
                    </div>
                  </div>

                  {/* Changes Summary */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Topology Changes</h4>
                    {bundle.transparency_bundle.change_summary.topology.length > 0 ? (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {bundle.transparency_bundle.change_summary.topology.map((c, i) => (
                          <li key={i}>• {c}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No topology changes</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Rights Changes</h4>
                    {bundle.transparency_bundle.change_summary.rights.length > 0 ? (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {bundle.transparency_bundle.change_summary.rights.map((c, i) => (
                          <li key={i}>• {c}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No rights changes</p>
                    )}
                  </div>

                  {/* Proof */}
                  {bundle.transparency_bundle.proof.tx_hash && (
                    <div className="p-3 bg-[hsl(var(--audit-pass))]/10 rounded-lg border border-[hsl(var(--audit-pass))]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-[hsl(var(--audit-pass))]" />
                        <span className="font-medium text-sm">Blockchain Anchored</span>
                      </div>
                      <div className="font-mono text-xs truncate">
                        {bundle.transparency_bundle.proof.tx_hash}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="json" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <pre className="json-viewer text-xs">
                    {JSON.stringify(bundle, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {!bundle && (
        <div className="text-center py-12 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Generate a transparency bundle to create a public-safe summary</p>
        </div>
      )}
    </div>
  );
}
