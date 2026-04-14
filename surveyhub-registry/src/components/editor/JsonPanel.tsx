import React from 'react';

import { SubmissionPayload } from '@udhbha/types';


interface JsonPanelProps {
  submission: SubmissionPayload;
}

const JsonPanel: React.FC<JsonPanelProps> = ({ submission }) => {
  // RULE 13: Use canonical export with deterministic ordering
  const canonicalSubmission = prepareCanonicalSubmission(submission);
  const jsonString = JSON.stringify(canonicalSubmission, null, 2);

  // RULE 12: Validate geometry references
  const geometryErrors = validateGeometryReferences(submission);
  
  // Check for DRAFT events in APPROVED status (RULE 7)
  const hasDraftEventsInApproved = submission.meta.status === 'APPROVED' && 
    (submission.rights_events || []).some(e => e.origin === 'DRAFT');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    toast.success('Canonical JSON copied to clipboard');
  };

  const handleExport = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${submission.meta.submission_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Canonical JSON exported successfully');
  };

  const isValid = geometryErrors.length === 0 && !hasDraftEventsInApproved;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Final Built JSON
        </h3>
        {isValid ? (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-400">
            <CheckCircle className="w-3 h-3" />
            Valid
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Issues
          </Badge>
        )}
      </div>

      {/* Validation warnings */}
      {(geometryErrors.length > 0 || hasDraftEventsInApproved) && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="py-3">
            <div className="text-xs space-y-1">
              {geometryErrors.map((err, i) => (
                <p key={i} className="text-amber-700 dark:text-amber-300">• {err}</p>
              ))}
              {hasDraftEventsInApproved && (
                <p className="text-amber-700 dark:text-amber-300">
                  • APPROVED submission contains DRAFT events (will be converted on export)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Canonical Backend Contract</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleExport}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-[10px]">
            Deterministic ordering • ISO timestamps • Computed claims_current
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <pre className="json-viewer text-[11px] leading-relaxed max-h-[calc(100vh-350px)]">
            {jsonString}
          </pre>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={handleCopy}>
          <Copy className="w-3.5 h-3.5" />
          Copy JSON
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
          Export .json
        </Button>
      </div>
    </div>
  );
};

export default JsonPanel;
