'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { post, endpoints } from '@/lib/api';
import { leaveTypeKeys, useLeaveTypes } from '@/hooks/use-hr';

interface LeaveTypeRow {
  id: string;
  name: string;
  code: string;
  defaultDays?: number;
  isPaid?: boolean;
  isCarryForward?: boolean;
  maxCarryForwardDays?: number;
  isActive?: boolean;
}

interface FormData {
  name: string;
  code: string;
  defaultDays: string;
  isPaid: boolean;
  isCarryForward: boolean;
  maxCarryForwardDays: string;
  isActive: boolean;
}

const initialForm: FormData = {
  name: '',
  code: '',
  defaultDays: '0',
  isPaid: true,
  isCarryForward: false,
  maxCarryForwardDays: '0',
  isActive: true,
};

function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      post(endpoints.leaveTypes.list, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveTypeKeys.all }),
  });
}

export default function LeaveTypesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const { data, isLoading } = useLeaveTypes();
  const create = useCreateLeaveType();

  const leaveTypes = (data ?? []) as unknown as LeaveTypeRow[];

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.name.length > 255) errs.name = 'Name must be ≤ 255 chars';
    if (!form.code.trim()) errs.code = 'Code is required';
    if (form.code.length > 50) errs.code = 'Code must be ≤ 50 chars';
    if (form.defaultDays && (parseInt(form.defaultDays, 10) < 0 || isNaN(parseInt(form.defaultDays, 10)))) {
      errs.defaultDays = 'Default days must be a non-negative integer';
    }
    if (form.maxCarryForwardDays && (parseInt(form.maxCarryForwardDays, 10) < 0 || isNaN(parseInt(form.maxCarryForwardDays, 10)))) {
      errs.maxCarryForwardDays = 'Max carry-forward days must be a non-negative integer';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      isPaid: form.isPaid,
      isCarryForward: form.isCarryForward,
      isActive: form.isActive,
    };
    if (form.defaultDays) payload.defaultDays = parseInt(form.defaultDays, 10);
    if (form.maxCarryForwardDays) payload.maxCarryForwardDays = parseInt(form.maxCarryForwardDays, 10);

    try {
      await create.mutateAsync(payload);
      toast.success('Leave type created');
      setForm(initialForm);
      setErrors({});
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create leave type';
      toast.error(msg);
    }
  }

  const columns: ColumnDef<LeaveTypeRow, unknown>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => <SortableHeader column={column}>Code</SortableHeader>,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'defaultDays',
      header: 'Default Days',
      cell: ({ row }) => <span className="text-sm">{row.original.defaultDays ?? 0}</span>,
    },
    {
      accessorKey: 'isPaid',
      header: 'Paid',
      cell: ({ row }) => (
        <Badge variant={row.original.isPaid ? 'default' : 'outline'}>
          {row.original.isPaid ? 'Paid' : 'Unpaid'}
        </Badge>
      ),
    },
    {
      accessorKey: 'isCarryForward',
      header: 'Carry-forward',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.isCarryForward ? `Up to ${row.original.maxCarryForwardDays ?? 0}` : 'No'}
        </span>
      ),
    },
  ];

  return (
    <>
      <ListPage
        title="Leave Types"
        subtitle="Configure leave categories used in applications"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Leave Types' },
        ]}
        summaryCards={[
          { label: 'Total Types', value: leaveTypes.length },
          { label: 'Active', value: leaveTypes.filter((l) => l.isActive !== false).length },
        ]}
        toolbarActions={
          <Button size="sm" onClick={() => setOpen(true)}>
            New Leave Type
          </Button>
        }
      >
        <DataTable
          columns={columns}
          data={leaveTypes}
          isLoading={isLoading}
          searchPlaceholder="Search leave types..."
          searchValue={search}
          onSearchChange={setSearch}
          emptyMessage="No leave types defined yet."
          emptyAction={{ label: 'Create Leave Type', onClick: () => setOpen(true) }}
        />
      </ListPage>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Leave Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., CL, SL, EL"
                  maxLength={50}
                  className="font-mono"
                />
                {errors.code && <p className="mt-1 text-xs text-destructive">{errors.code}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Default Days</label>
                <Input
                  type="number"
                  min="0"
                  value={form.defaultDays}
                  onChange={(e) => setForm({ ...form, defaultDays: e.target.value })}
                />
                {errors.defaultDays && <p className="mt-1 text-xs text-destructive">{errors.defaultDays}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Casual Leave"
                maxLength={255}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.isPaid}
                  onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
                  className="h-4 w-4"
                />
                Paid leave
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.isCarryForward}
                  onChange={(e) => setForm({ ...form, isCarryForward: e.target.checked })}
                  className="h-4 w-4"
                />
                Carry forward
              </label>
            </div>
            {form.isCarryForward && (
              <div>
                <label className="text-sm font-medium">Max Carry-forward Days</label>
                <Input
                  type="number"
                  min="0"
                  value={form.maxCarryForwardDays}
                  onChange={(e) => setForm({ ...form, maxCarryForwardDays: e.target.value })}
                />
                {errors.maxCarryForwardDays && (
                  <p className="mt-1 text-xs text-destructive">{errors.maxCarryForwardDays}</p>
                )}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
