// ============================================
// TRUST SUMMARY CARD
// Sticky header showing record validity status
// ============================================

import { toast } from 'sonner';

import { PublicRecordData } from '@udhbha/types';


interface TrustSummaryCardProps {
  data: PublicRecordData;
}

export function TrustSummaryCard({ data }: TrustSummaryCardProps) {
  const { submission, registrarRecord, chainAnchor } = data;

  const isApproved = registrarRecord?.decision === 'APPROVED_FINAL' || !!chainAnchor;
  const isRejected = registrarRecord?.decision === 'REJECTED_FINAL';
  const isPending = !registrarRecord;

  const approvedColor = getStatusColor('APPROVED');
  const rejectedColor = getStatusColor('REJECTED');

  const StatusIcon = isApproved ? CheckCircle : isRejected ? XCircle : Clock;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const shortenHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <Card className="sticky top-4 z-10 shadow-lg border-2">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Parcel Info */}
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPending ? 'bg-muted' : 'text-white'}`}
              style={!isPending ? {
                backgroundColor: isApproved ? approvedColor : rejectedColor
              } : undefined}
            >
              <StatusIcon className={`w-6 h-6 ${isPending ? 'text-muted-foreground' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">{submission.parcel.name || submission.parcel.parcel_id}</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(submission.parcel.parcel_id, 'Parcel ID')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Parcel ID</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                Revision {submission.meta.revision_number || 1} • {submission.parcel.parcel_id}
              </p>
            </div>
          </div>

          {/* Center: Status */}
          <div className="flex items-center gap-3">
            <Badge
              className={isPending ? 'bg-muted text-muted-foreground' : 'text-white'}
              style={!isPending ? {
                backgroundColor: isApproved ? approvedColor : rejectedColor
              } : undefined}
            >
              {isApproved ? 'LEGALLY VALID' : isRejected ? 'REJECTED' : 'PENDING APPROVAL'}
            </Badge>
            {registrarRecord && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(registrarRecord.decided_at), 'dd MMM yyyy')}
              </span>
            )}
          </div>

          {/* Right: Chain Anchor */}
          <div className="flex items-center gap-3">
            {chainAnchor ? (
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <LinkIcon className="w-4 h-4" style={{ color: approvedColor }} />
                <div className="text-sm">
                  <div className="font-mono text-xs">{shortenHash(chainAnchor.tx_hash)}</div>
                  <div className="text-xs text-muted-foreground">{chainAnchor.network} Network</div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(chainAnchor.tx_hash, 'Transaction hash')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Transaction Hash</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not Anchored
              </Badge>
            )}
          </div>
        </div>

        {/* Bottom: Trust Statement */}
        <div className="mt-3 pt-3 border-t text-sm">
          {isApproved ? (
            <p style={{ color: approvedColor }}>
              ✓ This record has been audited and legally approved. The ownership information is authoritative.
            </p>
          ) : isRejected ? (
            <p style={{ color: rejectedColor }}>
              ✗ This record was rejected during the approval process. It is not legally valid.
            </p>
          ) : (
            <p className="text-muted-foreground">
              ⏳ This record is pending final approval. Ownership information may not be finalized.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
