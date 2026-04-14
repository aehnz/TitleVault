// ============================================
// INBOX TABLE COMPONENT
// Displays audit queue items
// ============================================

import { 
  ArrowRight, 
  Building2, 
  Calendar, 
  GitBranch, 
  Layers 
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge, ChangeKindBadge } from './StatusBadge';

import { InboxItem } from '@udhbha/types';


interface InboxTableProps {
  items: InboxItem[];
  isLoading?: boolean;
}

export function InboxTable({ items, isLoading }: InboxTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Loading submissions...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No submissions to audit</h3>
            <p className="text-muted-foreground">
              When surveyors submit revisions for review, they'll appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Pending Audit Queue
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px]">Submission ID</TableHead>
              <TableHead>Parcel</TableHead>
              <TableHead>Change Type</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.submission_id}
                className="cursor-pointer"
                onClick={() => navigate(`/auditor/review/${item.submission_id}`)}
              >
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <span>{item.submission_id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Revision #{item.revision_number}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{item.parcel_name || item.parcel_id}</div>
                      {item.parcel_name && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.parcel_id}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <ChangeKindBadge kind={item.change_kind} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">Topo:</span>
                      <span className="font-medium">{item.event_counts.topology}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">Rights:</span>
                      <span className="font-medium">{item.event_counts.rights}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{format(new Date(item.submitted_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    by {item.submitted_by}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/auditor/review/${item.submission_id}`);
                    }}
                  >
                    Review
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
