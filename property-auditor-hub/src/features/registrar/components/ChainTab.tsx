// ============================================
// CHAIN TAB
// Blockchain hashing and anchoring UI
// ============================================

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { AuditReport, ChainAnchor, ComputedHashes, Submission } from '@udhbha/types';


interface ChainTabProps {
  submission: Submission;
  parent: Submission | null;
  auditReport: AuditReport;
  hashes: ComputedHashes | null;
  chainAnchor: ChainAnchor | null;
  onComputeHashes: () => Promise<ComputedHashes>;
  onAnchor: () => Promise<ChainAnchor>;
}

export function ChainTab({ 
  submission, 
  parent, 
  auditReport, 
  hashes, 
  chainAnchor,
  onComputeHashes,
  onAnchor,
}: ChainTabProps) {
  const [isComputing, setIsComputing] = useState(false);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [network, setNetwork] = useState('DEMO');

  const handleComputeHashes = async () => {
    setIsComputing(true);
    try {
      await onComputeHashes();
      toast.success('Hashes computed successfully');
    } catch (error) {
      toast.error('Failed to compute hashes');
    } finally {
      setIsComputing(false);
    }
  };

  const handleAnchor = async () => {
    if (!hashes) {
      toast.error('Compute hashes first');
      return;
    }
    setIsAnchoring(true);
    try {
      await onAnchor();
      toast.success('Anchored on chain (Demo)');
    } catch (error) {
      toast.error('Failed to anchor on chain');
    } finally {
      setIsAnchoring(false);
    }
  };

  const copyHash = (label: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={handleComputeHashes}
          disabled={isComputing}
          className="gap-2"
        >
          {isComputing ? (
            <>Computing...</>
          ) : (
            <>
              <Hash className="w-4 h-4" />
              {hashes ? 'Recompute Hashes' : 'Compute Hashes'}
            </>
          )}
        </Button>
        
        <div className="flex gap-2">
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEMO">DEMO (Test)</SelectItem>
              <SelectItem value="POLYGON" disabled>Polygon</SelectItem>
              <SelectItem value="ETHEREUM" disabled>Ethereum</SelectItem>
              <SelectItem value="STARKNET" disabled>StarkNet</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={handleAnchor}
            disabled={!hashes || isAnchoring || !!chainAnchor}
            variant={chainAnchor ? 'secondary' : 'default'}
            className="gap-2"
          >
            {isAnchoring ? (
              <>Anchoring...</>
            ) : chainAnchor ? (
              <>
                <Check className="w-4 h-4" />
                Anchored
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                Anchor on Chain (Demo)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Computed Hashes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Computed Hashes
          </CardTitle>
          <CardDescription>
            SHA256 hashes of canonical JSON representations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hashes ? (
            <div className="space-y-3">
              {[
                { label: 'Parent Hash', value: hashes.parent_hash },
                { label: 'Submission Hash', value: hashes.submission_hash },
                { label: 'Audit Hash', value: hashes.audit_hash },
                { label: 'Bundle Hash', value: hashes.bundle_hash },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate max-w-md">
                      {value}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyHash(label, value)}
                    className="gap-1"
                  >
                    {copied === label ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Hash className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Click "Compute Hashes" to generate cryptographic hashes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chain Anchor Details */}
      {chainAnchor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-[hsl(var(--audit-pass))]" />
              Chain Anchor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[hsl(var(--audit-pass))]/10 rounded-lg border border-[hsl(var(--audit-pass))]/30">
                <div>
                  <div className="text-sm font-medium">Transaction Hash</div>
                  <div className="font-mono text-sm">{chainAnchor.tx_hash}</div>
                </div>
                <Badge className="status-pass">{chainAnchor.network}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-muted-foreground text-xs">Anchored At</div>
                  <div>{new Date(chainAnchor.anchored_at).toLocaleString()}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-muted-foreground text-xs">Network</div>
                  <div>{chainAnchor.network}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Steps */}
      <Accordion type="single" collapsible>
        <AccordionItem value="verify">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Verification Steps
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <div className="font-medium">Download JSON</div>
                  <p className="text-sm text-muted-foreground">Export parent, submission, and audit report as JSON files</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <div className="font-medium">Compute Hashes</div>
                  <p className="text-sm text-muted-foreground">Use canonical JSON (sorted keys) and SHA256 to compute hashes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <div className="font-medium">Compare Bundle Hash</div>
                  <p className="text-sm text-muted-foreground">Verify your computed bundle_hash matches the anchored hash</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                <div>
                  <div className="font-medium">Verify on Chain</div>
                  <p className="text-sm text-muted-foreground">Look up tx_hash on the blockchain explorer to confirm anchoring</p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
