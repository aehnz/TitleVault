// ============================================
// CHAIN PROOF SECTION
// Hash display and verification
// ============================================

import { 
  Shield, 
  Copy, 
  Check, 
  X, 
  Download, 
  RefreshCw, 
  ChevronDown,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

import { PublicExportBundle, PublicRecordData, VerificationResult } from '@udhbha/types';


interface ChainProofSectionProps {
  data: PublicRecordData;
}

export function ChainProofSection({ data }: ChainProofSectionProps) {
  const { submission, parent, auditReport, registrarRecord, chainAnchor } = data;
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const shortenHash = (hash: string, chars = 12) => {
    if (hash.length <= chars * 2) return hash;
    return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
  };

  const handleVerify = async () => {
    if (!auditReport || !chainAnchor) return;
    
    setIsVerifying(true);
    
    try {
      const computed = await computeHashes(parent, submission, auditReport);
      
      const mismatches: string[] = [];
      if (computed.bundle_hash !== chainAnchor.bundle_hash) mismatches.push('bundle_hash');
      if (computed.submission_hash !== chainAnchor.submission_hash) mismatches.push('submission_hash');
      if (computed.audit_hash !== chainAnchor.audit_hash) mismatches.push('audit_hash');
      if (computed.parent_hash !== chainAnchor.parent_hash) mismatches.push('parent_hash');
      
      setVerificationResult({
        isVerified: mismatches.length === 0,
        computedHashes: {
          bundleHash: computed.bundle_hash,
          submissionHash: computed.submission_hash,
          auditHash: computed.audit_hash,
          parentHash: computed.parent_hash,
        },
        storedHashes: {
          bundleHash: chainAnchor.bundle_hash,
          submissionHash: chainAnchor.submission_hash,
          auditHash: chainAnchor.audit_hash,
          parentHash: chainAnchor.parent_hash,
        },
        mismatches,
      });
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = () => {
    const bundle: PublicExportBundle = {
      parcel_id: submission.parcel.parcel_id,
      parcel_name: submission.parcel.name || submission.parcel.parcel_id,
      revision: submission.meta.revision_number || 1,
      status: registrarRecord?.decision || 'PENDING',
      change_summary: {
        topology: submission.topology_events
          .filter(e => e.draft_state !== 'UNDONE')
          .map(e => `${e.kind} ${e.target.id}`),
        rights: submission.rights_events
          .filter(e => e.draft_state !== 'UNDONE')
          .map(e => `${e.kind} ${e.target.id}`),
      },
      audit: {
        decision: auditReport?.decision || 'PENDING',
        public_notes: auditReport?.notes.public || '',
        audited_at: auditReport?.audited_at || '',
      },
      registrar: {
        decision: registrarRecord?.decision || 'PENDING',
        public_notes: registrarRecord?.notes.public || '',
        decided_at: registrarRecord?.decided_at || '',
      },
      proof: {
        bundle_hash: chainAnchor?.bundle_hash || '',
        submission_hash: chainAnchor?.submission_hash || '',
        audit_hash: chainAnchor?.audit_hash || '',
        parent_hash: chainAnchor?.parent_hash || '',
        tx_hash: chainAnchor?.tx_hash || '',
        network: chainAnchor?.network || 'NONE',
      },
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transparency_${submission.parcel.parcel_id}_r${submission.meta.revision_number || 1}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Public record downloaded');
  };

  const HashRow = ({ label, hash, isMismatch }: { label: string; hash: string; isMismatch?: boolean }) => (
    <div className={`flex items-center justify-between py-2 ${isMismatch ? 'bg-destructive/10 -mx-2 px-2 rounded' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
          {shortenHash(hash)}
        </code>
        {isMismatch && <X className="w-4 h-4 text-destructive" />}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => copyToClipboard(hash, label)}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy {label}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );

  if (!chainAnchor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Blockchain Proof
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This record has not been anchored to a blockchain yet. 
            Proof data will be available after final approval.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[hsl(var(--audit-pass))]" />
            Blockchain Proof
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {chainAnchor.network}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hash Display */}
        <div className="divide-y">
          <HashRow 
            label="Transaction Hash" 
            hash={chainAnchor.tx_hash} 
          />
          <HashRow 
            label="Bundle Hash" 
            hash={chainAnchor.bundle_hash}
            isMismatch={verificationResult?.mismatches.includes('bundle_hash')}
          />
          <HashRow 
            label="Submission Hash" 
            hash={chainAnchor.submission_hash}
            isMismatch={verificationResult?.mismatches.includes('submission_hash')}
          />
          <HashRow 
            label="Audit Hash" 
            hash={chainAnchor.audit_hash}
            isMismatch={verificationResult?.mismatches.includes('audit_hash')}
          />
          <HashRow 
            label="Parent Hash" 
            hash={chainAnchor.parent_hash}
            isMismatch={verificationResult?.mismatches.includes('parent_hash')}
          />
        </div>

        {/* Verification Result */}
        {verificationResult && (
          <div className={`p-3 rounded-lg border ${
            verificationResult.isVerified 
              ? 'bg-[hsl(var(--audit-pass))]/10 border-[hsl(var(--audit-pass))]/30' 
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <div className="flex items-center gap-2">
              {verificationResult.isVerified ? (
                <>
                  <Check className="w-5 h-5 text-[hsl(var(--audit-pass))]" />
                  <span className="font-medium text-[hsl(var(--audit-pass))]">
                    Verified - All hashes match
                  </span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-destructive" />
                  <span className="font-medium text-destructive">
                    Mismatch Detected - {verificationResult.mismatches.length} hash(es) don't match
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying || !auditReport}
            variant="outline"
            className="flex-1"
          >
            {isVerifying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Recompute & Verify
          </Button>
          <Button onClick={handleDownload} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download Public Record
          </Button>
        </div>

        {/* How It Works */}
        <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              How verification works
              <ChevronDown className={`w-4 h-4 transition-transform ${howItWorksOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="text-sm text-muted-foreground space-y-2 bg-muted/50 rounded-lg p-3">
              <p><strong>1. Download public JSON</strong> - Get the transparency bundle containing all public data.</p>
              <p><strong>2. Compute SHA-256</strong> - Hash the canonical JSON representation of the data.</p>
              <p><strong>3. Match bundle hash</strong> - Compare your computed hash with the stored bundle_hash.</p>
              <p><strong>4. Compare with blockchain</strong> - The tx_hash references the on-chain record containing this bundle_hash.</p>
              <p className="pt-2 border-t">
                If all hashes match, the record has not been tampered with since it was anchored to the blockchain.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
