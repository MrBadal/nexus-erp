'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ListPage } from '@/components/layout/list-page';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useRegularizations,
  useApproveRegularization,
  useRejectRegularization,
  type RegularizationStatus,
  type RequestedAttendanceStatus,
} from '@/hooks/use-attendance-regularization';

const REQUESTED_STATUS_LABELS: Record<RequestedAttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half Day',
  late: 'Late',
  on_leave: 'On Leave',
};

function statusBadgeVariant(
  status: RegularizationStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

export default function AttendanceRegularizationsPage() {
  const [status, setStatus] = React.useState<string>('pending');

  const filters = status === 'all' ? undefined : { status };
  const { data: requests, isLoading } = useRegularizations(filters);
  const approve = useApproveRegularization();
  const reject = useRejectRegularization();

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync({ id });
      toast.success('Regularization approved and applied to attendance');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    const reviewNotes = window.prompt('Reason for rejection (optional):') ?? undefined;
    try {
      await reject.mutateAsync({ id, reviewNotes });
      toast.success('Regularization rejected');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message ?? e.message ?? 'Failed to reject');
    }
  };

  return (
    <ListPage
      title="Attendance Regularizations"
      subtitle="Review and approve employee requests to correct their attendance."
      filterConfig={[
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'All', value: 'all' },
          ],
        },
      ]}
      filterValues={{ status }}
      onFilterChange={(key, value) => {
        if (key === 'status') setStatus((value as string) || 'pending');
      }}
      onFilterClear={() => setStatus('pending')}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No regularization requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Requested Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.employee ?? 'Unknown'}</div>
                      {r.empId && (
                        <div className="text-xs text-muted-foreground">{r.empId}</div>
                      )}
                    </TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>
                      {REQUESTED_STATUS_LABELS[r.requestedStatus] ?? r.requestedStatus}
                    </TableCell>
                    <TableCell>{formatDateTime(r.requestedCheckIn)}</TableCell>
                    <TableCell>{formatDateTime(r.requestedCheckOut)}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {r.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(r.id)}
                            disabled={approve.isPending}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(r.id)}
                            disabled={reject.isPending}
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.reviewNotes || '—'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </ListPage>
  );
}
