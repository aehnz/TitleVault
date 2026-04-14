import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import { useSubmissionList, useCreateSubmission } from '@/hooks/useSubmissions';
import {
  FileText,
  Send,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Plus
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: submissions = [], isLoading } = useSubmissionList();
  const createMutation = useCreateSubmission();

  const counts = {
    drafts: submissions.filter(s => s.meta.status === 'DRAFT').length,
    submitted: submissions.filter(s => s.meta.status === 'SUBMITTED').length,
    returned: submissions.filter(s => s.meta.status === 'RETURNED').length,
    approved: submissions.filter(s => s.meta.status === 'APPROVED').length,
    errors: 0,
  };

  const handleNewSubmission = async () => {
    const id = await createMutation.mutateAsync();
    if (id) {
      navigate(`/app/editor/${id}`);
    }
  };

  const handleOpenSubmission = async (id: string, status: string) => {
    if (status === 'APPROVED') {
      navigate(`/app/viewer/${id}`);
    } else {
      navigate(`/app/editor/${id}`);
    }
  };

  const recentSubmissions = [...submissions]
    .sort((a, b) => new Date(b.meta.updated_at || 0).getTime() - new Date(a.meta.updated_at || 0).getTime())
    .slice(0, 10);

  const statCards = [
    { label: 'Drafts', value: counts.drafts, icon: FileText, color: 'text-gray-600 bg-gray-100' },
    { label: 'Submitted', value: counts.submitted, icon: Send, color: 'text-blue-600 bg-blue-100' },
    { label: 'Returned', value: counts.returned, icon: RotateCcw, color: 'text-orange-600 bg-orange-100' },
    { label: 'Approved', value: counts.approved, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { label: 'Errors', value: counts.errors, icon: AlertCircle, color: 'text-red-600 bg-red-100' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your survey submissions</p>
        </div>
        <Button onClick={handleNewSubmission} className="gap-2">
          <Plus className="w-4 h-4" />
          New Submission
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>Your latest survey submissions and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No submissions yet</p>
              <Button onClick={handleNewSubmission} className="mt-4" variant="outline">
                Create your first submission
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Parcel Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubmissions.map((sub) => (
                  <TableRow key={sub.meta.submission_id}>
                    <TableCell className="font-mono text-xs">{sub.meta.submission_id}</TableCell>
                    <TableCell>{sub.parcel.name || '(Unnamed)'}</TableCell>
                    <TableCell>
                      <StatusBadge status={sub.meta.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sub.meta.updated_at ? new Date(sub.meta.updated_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenSubmission(sub.meta.submission_id, sub.meta.status)}
                        className="gap-1"
                      >
                        {sub.meta.status === 'APPROVED' ? (
                          <>
                            <Eye className="w-4 h-4" />
                            View
                          </>
                        ) : (
                          <>
                            <Edit className="w-4 h-4" />
                            Edit
                          </>
                        )}
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
  );
};

export default DashboardPage;
