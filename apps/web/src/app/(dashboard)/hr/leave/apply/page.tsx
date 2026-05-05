'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  useCreateLeaveApplication,
  useLeaveTypes,
  useEmployees,
} from '@/hooks/use-hr';

interface FormData {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

const initialForm: FormData = {
  employeeId: '',
  leaveTypeId: '',
  fromDate: '',
  toDate: '',
  reason: '',
};

function calcTotalDays(fromDate: string, toDate: string): number {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  const diffMs = to.getTime() - from.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export default function ApplyLeavePage() {
  const router = useRouter();
  const create = useCreateLeaveApplication();
  const { data: employees } = useEmployees();
  const { data: leaveTypes } = useLeaveTypes();
  const allEmployees = employees ?? [];
  const allLeaveTypes = leaveTypes ?? [];

  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const totalDays = useMemo(
    () => calcTotalDays(form.fromDate, form.toDate),
    [form.fromDate, form.toDate],
  );

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.employeeId) errs.employeeId = 'Employee is required';
    if (!form.leaveTypeId) errs.leaveTypeId = 'Leave type is required';
    if (!form.fromDate) errs.fromDate = 'From date is required';
    if (!form.toDate) errs.toDate = 'To date is required';
    if (form.fromDate && form.toDate && new Date(form.toDate) < new Date(form.fromDate)) {
      errs.toDate = 'To date must be on or after from date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (totalDays < 1) {
      toast.error('Total days must be at least 1');
      return;
    }

    const payload: Record<string, unknown> = {
      employeeId: form.employeeId,
      leaveTypeId: form.leaveTypeId,
      fromDate: form.fromDate, // YYYY-MM-DD ISO format
      toDate: form.toDate,
      totalDays,
    };
    if (form.reason.trim()) payload.reason = form.reason.trim();

    try {
      await create.mutateAsync(payload);
      toast.success('Leave application submitted');
      router.push('/hr/leave');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit leave application';
      toast.error(msg);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/hr/leave">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Apply for Leave</h1>
          <p className="text-sm text-muted-foreground">Submit a leave application on behalf of an employee</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Leave Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Employee *</label>
              <select
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              >
                <option value="">Select employee...</option>
                {allEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </select>
              {errors.employeeId && <p className="mt-1 text-xs text-destructive">{errors.employeeId}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Leave Type *</label>
              <select
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.leaveTypeId}
                onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              >
                <option value="">Select leave type...</option>
                {allLeaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </select>
              {errors.leaveTypeId && <p className="mt-1 text-xs text-destructive">{errors.leaveTypeId}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Total Days</label>
              <input
                type="text"
                readOnly
                className="mt-1 w-full rounded-md border bg-muted px-3 py-2 text-sm font-semibold"
                value={totalDays}
              />
            </div>
            <div>
              <label className="text-sm font-medium">From Date *</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.fromDate}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              />
              {errors.fromDate && <p className="mt-1 text-xs text-destructive">{errors.fromDate}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">To Date *</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.toDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
              />
              {errors.toDate && <p className="mt-1 text-xs text-destructive">{errors.toDate}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Reason</h2>
          <textarea
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Reason for leave (e.g., medical, personal)..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/hr/leave"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Submitting...' : 'Submit Leave Application'}
          </Button>
        </div>
      </form>
    </div>
  );
}
