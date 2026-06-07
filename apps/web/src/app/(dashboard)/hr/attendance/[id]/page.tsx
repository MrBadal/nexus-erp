'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendance, useUpdateAttendance, useDeleteAttendance } from '@/hooks/use-hr';

const STATUS_OPTIONS = ['present', 'absent', 'half_day', 'late', 'on_leave'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AttendanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const recordId = params.id;

  // Fetch full list and find the record by id (attendance has no single-record GET)
  const { data: records, isLoading, error } = useAttendance();
  const record = records?.find((r) => r.id === recordId);

  const updateMutation = useUpdateAttendance();
  const deleteMutation = useDeleteAttendance();

  const [status, setStatus] = useState<string>('present');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setNotes(record.notes || '');
    }
  }, [record]);

  // ---------- Loading / Error ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading attendance record' : 'Attendance record not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/hr/attendance')}
          >
            Back to attendance
          </button>
        </div>
      </div>
    );
  }

  function handleSave() {
    updateMutation.mutate(
      { id: recordId, data: { status, notes } },
      {
        onSuccess: () => toast.success('Attendance record updated'),
        onError: () => toast.error('Failed to update attendance record'),
      },
    );
  }

  function handleDelete() {
    if (!confirm('Delete this attendance record? This cannot be undone.')) return;
    deleteMutation.mutate(recordId, {
      onSuccess: () => {
        toast.success('Attendance record deleted');
        router.push('/hr/attendance');
      },
      onError: () => toast.error('Failed to delete attendance record'),
    });
  }

  const meta = [
    { label: 'Employee', value: record.employeeName || record.empId || 'N/A' },
    { label: 'Employee ID', value: <span className="font-mono">{record.empId || 'N/A'}</span> },
    { label: 'Date', value: record.date || 'N/A' },
  ];

  return (
    <FormPage
      title={`Attendance — ${record.employeeName || record.empId}`}
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Attendance', href: '/hr/attendance' },
        { label: record.employeeName || record.empId || 'Record' },
      ]}
      backHref="/hr/attendance"
      primaryAction={{
        label: 'Save Changes',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      dangerAction={{
        label: 'Delete',
        onClick: handleDelete,
        disabled: deleteMutation.isPending,
      }}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Attendance Record" columns={2}>
          <FormField label="Employee">
            <Input value={record.employeeName || record.empId || ''} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Employee ID">
            <Input value={record.empId || ''} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Date">
            <Input value={record.date || ''} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring capitalize"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Check In">
            <Input value={record.checkIn || '-'} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Check Out">
            <Input value={record.checkOut || '-'} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Working Hours">
            <Input value={record.workingHours || '-'} readOnly className="font-mono bg-muted" />
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add a note or correction reason"
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
