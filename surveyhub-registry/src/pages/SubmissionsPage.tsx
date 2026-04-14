import React, { useState } from 'react';
import { ChangeKind, SubmissionPayload, SubmissionStatus } from '@udhbha/types';
import { useNavigate } from 'react-router-dom';
import { useSubmissionList, useDeleteSubmission, useCreateRevision } from '@/hooks/useSubmissions';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import CreateRevisionModal from '@/components/revision/CreateRevisionModal';
import { FileText, Eye, Edit, Lock, Trash2, GitBranch } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SubmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: submissions = [] } = useSubmissionList();
  const deleteMutation = useDeleteSubmission();
  const revisionMutation = useCreateRevision();
  const [filter, setFilter] = useState<'ALL' | SubmissionStatus>('ALL');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [revisionParentSubmission, setRevisionParentSubmission] = useState<SubmissionPayload | null>(null);

  const filteredSubmissions = filter === 'ALL'
    ? submissions
    : submissions.filter(s => s.meta.status === filter);

  const sortedSubmissions = [...filteredSubmissions].sort(
    (a, b) => new Date(b.meta.updated_at || 0).getTime() - new Date(a.meta.updated_at || 0).getTime()
  );

  const handleOpenSubmission = async (id: string, status: SubmissionStatus) => {
    if (status === 'APPROVED') {
      navigate(`/app/viewer/${id}`);
    } else {
      navigate(`/app/editor/${id}`);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleCreateRevision = async (changeKind: ChangeKind, changeNote: string) => {
    if (!revisionParentSubmission) return;

    const newId = await revisionMutation.mutateAsync({
      parentSubmission: revisionParentSubmission,
      changeKind,
      changeNote,
    });
    setRevisionParentSubmission(null);

    if (newId) {
      navigate(`/app/editor/${newId}`);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Submissions</h1>
        <p className="text-muted-foreground">Manage all your survey submissions</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="ALL">All ({submissions.length})</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft ({submissions.filter(s => s.meta.status === 'DRAFT').length})</TabsTrigger>
          <TabsTrigger value="SUBMITTED">Submitted ({submissions.filter(s => s.meta.status === 'SUBMITTED').length})</TabsTrigger>
          <TabsTrigger value="RETURNED">Returned ({submissions.filter(s => s.meta.status === 'RETURNED').length})</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved ({submissions.filter(s => s.meta.status === 'APPROVED').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {sortedSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No submissions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submission ID</TableHead>
                  <TableHead>Parcel Name</TableHead>
                  <TableHead>Rev.</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSubmissions.map((sub) => (
                  <TableRow key={sub.meta.submission_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{sub.meta.submission_id}</span>
                        {sub.meta.locked && (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{sub.parcel.name || '(Unnamed)'}</span>
                        {sub.meta.parent_submission_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            ← {sub.meta.parent_submission_id.slice(-12)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        #{sub.meta.revision_number ?? 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sub.meta.created_by}</TableCell>
                    <TableCell>
                      <StatusBadge status={sub.meta.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sub.meta.updated_at ? new Date(sub.meta.updated_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenSubmission(sub.meta.submission_id, sub.meta.status)}
                          title={sub.meta.status === 'APPROVED' ? 'View' : 'Edit'}
                        >
                          {sub.meta.status === 'APPROVED' ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <Edit className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Create Revision button for approved submissions */}
                        {sub.meta.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRevisionParentSubmission(sub)}
                            title="Create Revision"
                          >
                            <GitBranch className="w-4 h-4" />
                          </Button>
                        )}

                        {sub.meta.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(sub.meta.submission_id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this submission? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Revision Modal */}
      <CreateRevisionModal
        open={!!revisionParentSubmission}
        onOpenChange={(open) => !open && setRevisionParentSubmission(null)}
        onConfirm={handleCreateRevision}
        parentSubmission={revisionParentSubmission!}
      />
    </div>
  );
};

export default SubmissionsPage;
