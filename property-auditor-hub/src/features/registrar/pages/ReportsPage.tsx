// ============================================
// REGISTRAR REPORTS PAGE
// Lists completed registrar records
// ============================================

import { RegistrarRepo } from '../repos/RegistrarRepo';

import { RegistrarRecord } from '@udhbha/types';


export function ReportsPage() {
  const [records, setRecords] = useState<RegistrarRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<RegistrarRecord | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    RegistrarRepo.getAll().then(setRecords);
  }, []);

  const copyRecord = () => {
    if (selectedRecord) {
      navigator.clipboard.writeText(JSON.stringify(selectedRecord, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVED_FINAL': return 'status-pass';
      case 'RETURNED': return 'status-warn';
      case 'REJECTED_FINAL': return 'status-fail';
      default: return 'bg-muted';
    }
  };

  return (
    <>
      <RegistrarHeader />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Registrar Records</h1>
            <p className="text-muted-foreground">
              View all completed registrar decisions and records
            </p>
          </div>

          <Card>
            <CardContent className="p-0">
              {records.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No registrar records yet.</p>
                  <p className="text-sm mt-1">Process submissions from the inbox to create records.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Record ID</TableHead>
                      <TableHead>Submission</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Decided</TableHead>
                      <TableHead>Anchored</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(record => (
                      <TableRow key={record.record_id}>
                        <TableCell className="font-mono text-sm">{record.record_id}</TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{record.submission_id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDecisionColor(record.decision)}>
                            {record.decision}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(record.decided_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {record.chain_anchor ? (
                            <Badge variant="outline" className="gap-1">
                              <LinkIcon className="w-3 h-3" />
                              {record.chain_anchor.network}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRecord(record)}
                            className="gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
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

      {/* Record Details Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Registrar Record Details</DialogTitle>
            <DialogDescription>
              {selectedRecord?.record_id}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            <pre className="json-viewer text-xs">
              {JSON.stringify(selectedRecord, null, 2)}
            </pre>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={copyRecord} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
