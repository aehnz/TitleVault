// ============================================
// DOCUMENT VIEWER COMPONENT
// Inline PDF viewer with demo placeholder support
// ============================================

import { Badge } from '@/components/ui/badge';

import { DocumentEntry, DocumentRef } from '@udhbha/types';


interface DocumentViewerProps {
  document: DocumentRef;
  documentEntry?: DocumentEntry;
  onClose: () => void;
}

// Map document types to demo PDF files
const DEMO_PDF_MAP: Record<string, string> = {
  plan: '/demo-pdfs/demo_plan.pdf',
  sale_deed: '/demo-pdfs/demo_sale_deed.pdf',
  survey: '/demo-pdfs/demo_survey.pdf',
  lease: '/demo-pdfs/demo_generic.pdf',
  mortgage: '/demo-pdfs/demo_generic.pdf',
  other: '/demo-pdfs/demo_generic.pdf',
};

function resolvePdfUrl(document: DocumentRef, entry?: DocumentEntry): string {
  // If we have a real URL, use it
  if (entry?.storage?.ref && !entry.storage.ref.startsWith('local://')) {
    return entry.storage.ref;
  }
  
  // Otherwise use demo placeholder based on document type
  return DEMO_PDF_MAP[document.type] || DEMO_PDF_MAP.other;
}

export function DocumentViewer({ document, documentEntry, onClose }: DocumentViewerProps) {
  const [error, setError] = useState(false);
  const pdfUrl = resolvePdfUrl(document, documentEntry);
  const isDemo = !documentEntry?.storage?.ref || documentEntry.storage.ref.startsWith('local://');

  return (
    <div className="flex flex-col h-full bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-medium truncate">{document.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {document.type}
              </Badge>
              {isDemo && (
                <Badge variant="secondary" className="text-xs">
                  Demo
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(pdfUrl, '_blank')}
            className="gap-1"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Embed */}
      <div className="flex-1 bg-muted/20">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Unable to load document preview
            </p>
            <Button
              variant="outline"
              onClick={() => window.open(pdfUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </Button>
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title={`Document: ${document.name}`}
            onError={() => setError(true)}
          />
        )}
      </div>

      {/* Footer info */}
      {isDemo && (
        <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          This is a demo placeholder. In production, the actual document would be displayed.
        </div>
      )}
    </div>
  );
}
