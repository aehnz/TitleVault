// ============================================
// REGISTRAR INBOX PAGE
// Lists submissions with AUDIT_PASSED status
// ============================================

import { AuditReport, RegistrarInboxItem, Submission } from '@udhbha/types';


export function InboxPage() {
  const [items, setItems] = useState<RegistrarInboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [changeKindFilter, setChangeKindFilter] = useState<string>('all');
  const [anchorFilter, setAnchorFilter] = useState<string>('all');
  const navigate = useNavigate();

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      // Get all submissions with AUDIT_PASSED status
      const allSubmissions = await SubmissionRepo.listByStatus(['AUDIT_PASSED']);
      console.log('[Registrar Inbox] Found AUDIT_PASSED submissions:', allSubmissions.length, allSubmissions.map(s => s.meta.submission_id));
      
      // Build inbox items with audit reports
      const inboxItems: RegistrarInboxItem[] = [];
      
      for (const submission of allSubmissions) {
        const auditReport = await AuditRepo.getBySubmissionId(submission.meta.submission_id);
        const registrarRecord = await RegistrarRepo.getBySubmissionId(submission.meta.submission_id);
        console.log('[Registrar Inbox] Submission:', submission.meta.submission_id, 'auditReport:', !!auditReport, 'registrarRecord:', !!registrarRecord);
        // Skip if already processed by registrar
        if (registrarRecord) continue;
        
        inboxItems.push({
          submission_id: submission.meta.submission_id,
          parent_submission_id: submission.meta.parent_submission_id,
          parcel_id: submission.parcel.parcel_id,
          parcel_name: submission.parcel.name,
          revision_number: submission.meta.revision_number,
          change_kind: submission.meta.change_kind,
          audited_at: auditReport?.audited_at || submission.meta.updated_at,
          auditor_id: auditReport?.auditor_id || 'unknown',
          audit_summary: auditReport?.decision === 'PASS' ? 'PASS' : 'WARN',
          has_anchor: false, // Will be set after registrar processes
        });
      }
      
      setItems(inboxItems);
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.parcel_id.toLowerCase().includes(query) && 
            !item.submission_id.toLowerCase().includes(query) &&
            !(item.parcel_name?.toLowerCase().includes(query))) {
          return false;
        }
      }
      if (changeKindFilter !== 'all' && item.change_kind !== changeKindFilter) {
        return false;
      }
      if (anchorFilter === 'anchored' && !item.has_anchor) return false;
      if (anchorFilter === 'not_anchored' && item.has_anchor) return false;
      return true;
    });
  }, [items, searchQuery, changeKindFilter, anchorFilter]);

  const handleOpenReview = (submissionId: string) => {
    navigate(`/registrar/review/${submissionId}`);
  };

  return (
    <>
      <RegistrarHeader />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Registrar Inbox</h1>
              <p className="text-muted-foreground">
                Review and finalize audit-passed property submissions
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadQueue}
              className="gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by parcel or submission ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={changeKindFilter} onValueChange={setChangeKindFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Change Kind" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Change Types</SelectItem>
                    <SelectItem value="BASELINE">Baseline</SelectItem>
                    <SelectItem value="TOPOLOGY_ONLY">Topology Only</SelectItem>
                    <SelectItem value="RIGHTS_ONLY">Rights Only</SelectItem>
                    <SelectItem value="TOPOLOGY_AND_RIGHTS">Topology & Rights</SelectItem>
                    <SelectItem value="AUTO">Auto</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={anchorFilter} onValueChange={setAnchorFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Anchor Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="anchored">Anchored</SelectItem>
                    <SelectItem value="not_anchored">Not Anchored</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading submissions...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No audit-passed submissions pending registration.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submission</TableHead>
                      <TableHead>Parcel</TableHead>
                      <TableHead>Rev</TableHead>
                      <TableHead>Change Kind</TableHead>
                      <TableHead>Audited</TableHead>
                      <TableHead>Auditor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => (
                      <TableRow key={item.submission_id}>
                        <TableCell>
                          <div className="font-mono text-sm">{item.submission_id}</div>
                          {item.parent_submission_id && (
                            <div className="text-xs text-muted-foreground">
                              Parent: {item.parent_submission_id}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.parcel_name || item.parcel_id}</div>
                          <div className="text-xs text-muted-foreground font-mono">{item.parcel_id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">#{item.revision_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.change_kind}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(item.audited_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.auditor_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={item.audit_summary === 'PASS' ? 'status-pass' : 'status-warn'}>
                              {item.audit_summary}
                            </Badge>
                            {item.has_anchor && (
                              <LinkIcon className="w-4 h-4 text-[hsl(var(--audit-pass))]" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleOpenReview(item.submission_id)}
                            className="gap-1"
                          >
                            Open Review
                            <ExternalLink className="w-3 h-3" />
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
    </>
  );
}
