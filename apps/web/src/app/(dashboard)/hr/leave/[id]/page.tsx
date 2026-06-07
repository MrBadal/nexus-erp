'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useLeaveApplication,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
  useDeleteLeaveApplication,
  type LeaveApplication,
} from '@/hooks/use-hr';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type LeaveStatus = LeaveApplication['status'];

const statusVariantMap: Record<
  LeaveStatus,
  'success' | 'warning' | 'danger' | 'default' | 'muted'
> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'muted',
};

const statusLabelMap: Record<LeaveStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LeaveDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leaveId = params.id;

  const { data: leave, isLoading, error } = useLeaveApplication(leaveId);
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();
  const cancelMutation = useCancelLeave();
  const deleteMutation = useDeleteLeaveApplication();

  const status: LeaveStatus = leave?.status ?? 'pending';
  const isPending = status === 'pending';
  const isReadOnly = status === 'approved' || status === 'rejected' || status === 'cancelled';
  const canCancel = status === 'pending' || status === 'approved';

  const totalDays = useMemo(() => {
    if (!leave) return 0;
    if (leave.totalDays) return leave.totalDays;
    if (leave.fromDate && leave.toDate) {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      const diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diff);
    }
    return 0;
  }, [leave]);

  function handleApprove() {
    approveMutation.mutate(leaveId, {
      onSuccess: () => toast.success('Leave application approved'),
      onError: () => toast.error('Failed to approve leave application'),
    });
  }

  function handleReject() {
    rejectMutation.mutate(leaveId, {
      onSuccess: () => toast.success('Leave application rejected'),
      onError: () => toast.error('Failed to reject leave application'),
    });
  }

  function handleCancel() {
    if (!confirm('Cancel this leave application? If it was approved, the allocated days and attendance will be restored.')) return;
    cancelMutation.mutate(leaveId, {
      onSuccess: () => toast.success('Leave application cancelled'),
      onError: () => toast.error('Failed to cancel leave application'),
    });
  }

  function handleDelete() {
    if (!confirm('Delete this leave application? This cannot be undone.')) return;
    deleteMutation.mutate(leaveId, {
      onSuccess: () => {
        toast.success('Leave application deleted');
        router.push('/hr/leave');
      },
      onError: () => toast.error('Failed to delete leave application'),
    });
  }

  // ---------- Loading / Error ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !leave) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading leave application' : 'Leave application not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/hr/leave')}
          >
            Back to leave applications
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  const secondaryActions = [
    ...(isPending
      ? [
          {
            label: 'Approve',
            onClick: handleApprove,
            variant: 'outline' as const,
            disabled: approveMutation.isPending,
          },
          {
            label: 'Reject',
            onClick: handleReject,
            variant: 'outline' as const,
            disabled: rejectMutation.isPending,
          },
        ]
      : []),
    ...(canCancel
      ? [
          {
            label: cancelMutation.isPending ? 'Cancelling…' : 'Cancel Leave',
            onClick: handleCancel,
            variant: 'outline' as const,
            disabled: cancelMutation.isPending,
          },
        ]
      : []),
  ];

  const dangerAction = {
    label: 'Delete',
    onClick: handleDelete,
    disabled: deleteMutation.isPending,
  };

  const meta = [
    { label: 'Employee', value: leave.employee || 'Employee' },
    { label: 'Employee ID', value: <span className="font-mono">{leave.empId || 'N/A'}</span> },
    { label: 'Total Days', value: <span className="font-semibold">{totalDays}</span> },
    { label: 'Status', value: <Badge>{statusLabelMap[status]}</Badge> },
    { label: 'Submitted', value: formatDate(leave.createdAt) },
  ];

  return (
    <FormPage
      title={`Leave Application — ${leave.employee || 'Employee'}`}
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Leave Applications', href: '/hr/leave' },
        { label: leave.employee || 'Application' },
      ]}
      backHref="/hr/leave"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      secondaryActions={secondaryActions}
      dangerAction={dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Leave Details" columns={2}>
          <FormField label="Leave Type">
            <Input value={leave.leaveType} readOnly={isReadOnly} className={isReadOnly ? 'bg-muted' : ''} />
          </FormField>
          <FormField label="Employee">
            <Input value={leave.employee || 'Employee'} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Employee ID">
            <Input value={leave.empId || ''} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="From Date">
            <Input value={leave.fromDate} readOnly={isReadOnly} type="date" className={isReadOnly ? 'bg-muted' : ''} />
          </FormField>
          <FormField label="To Date">
            <Input value={leave.toDate} readOnly={isReadOnly} type="date" className={isReadOnly ? 'bg-muted' : ''} />
          </FormField>
          <FormField label="Total Days">
            <Input value={String(totalDays)} readOnly className="bg-muted font-semibold" />
          </FormField>
          <FormField label="Status">
            <div className="flex items-center h-9">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {statusLabelMap[status]}
              </span>
            </div>
          </FormField>
        </FormSection>

        <FormSection title="Reason" columns={1}>
          <FormField label="Reason for Leave">
            <Textarea
              value={leave.reason}
              readOnly={isReadOnly}
              className={isReadOnly ? 'bg-muted' : ''}
              rows={4}
              placeholder="Reason for leave request"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
