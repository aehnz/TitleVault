// ============================================
// REPORTS PAGE
// List of stored audit reports
// ============================================

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AuditRepo } from '../repos/AuditRepo';

import { AuditReport } from '@udhbha/types';


export function ReportsPage() {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    AuditRepo.getAll().then(setReports);
  }, []);

  const copyReport = () => {
    if (selectedReport) {
      navigator.clipboard.writeText(JSON.stringify(selectedReport, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'PASS':
        return 'bg-success/10 text-success border-success/20';
      case 'RETURNED':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'FAIL':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return '';
    }
  };

  return (
    <>
      <AuditorHeader
        title="Audit Reports"
        subtitle="View completed audit reports"
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                All Reports ({reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No audit reports yet.</p>
                  <p className="text-sm mt-1">Complete an audit to see reports here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Audit ID</TableHead>
                      <TableHead>Submission</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Audited At</TableHead>
                      <TableHead>Auditor</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.audit_id}>
                        <TableCell className="font-mono text-xs">
                          {report.audit_id.substring(0, 20)}...
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {report.submission_id}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('border', getDecisionColor(report.decision))}>
                            {report.decision}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(report.audited_at), 'PPp')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {report.auditor_id}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report viewer dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Audit Report
              {selectedReport && (
                <Badge className={cn('ml-2 border', getDecisionColor(selectedReport.decision))}>
                  {selectedReport.decision}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <div className="relative h-full">
              <Button
                variant="outline"
                size="sm"
                onClick={copyReport}
                className="absolute top-2 right-2 z-10 gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
              <ScrollArea className="h-[60vh]">
                <pre className="bg-muted p-4 rounded-lg text-xs font-mono">
                  {selectedReport && JSON.stringify(selectedReport, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
