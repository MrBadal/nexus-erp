'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  useExitClearances,
  useCreateExitClearance,
  type ExitClearance,
} from '@/hooks/use-exit-clearance';
import { useEmployees } from '@/hooks/use-hr';
import { formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  in_progress: 'warning',
  cleared: 'info',
  settled: 'success',
  cancelled: 'danger',
};

const statusLabel: Record<string, string> = {
  in_progress: 'In Progress',
  cleared: 'Cleared',
  settled: 'Settled',
  cancelled: 'Cancelled',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Cleared', value: 'cleared' },
      { label: 'Settled', value: 'settled' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
];

const columns: ColumnDef<ExitClearance, unknown>[] = [
  {
    accessorKey: 'employeeName',
    header: ({ column }) => <SortableHeader column={column}>Employee</SortableHeader>,
    cell: ({ row }) => (
      <Link
        href={`/hr/exit-clearances/${row.original.id}`}
        className="text-sm font-medium text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.employeeName || '—'}
      </Link>
    ),
  },
  {
    accessorKey: 'resignationDate',
    header: ({ column }) => <SortableHeader column={column}>Resignation</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.resignationDate ? formatDate(row.original.resignationDate) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'lastWorkingDate',
    header: 'Last Working Day',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.lastWorkingDate ? formatDate(row.original.lastWorkingDate) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="max-w-[220px] truncate text-sm">{row.original.reason || '—'}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status;
      return <StatusDot status={statusVariant[s] || 'info'} label={statusLabel[s] || s} />;
    },
  },
];

export default function ExitClearancesPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [resignationDate, setResignationDate] = useState('');
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [reason, setReason] = useState('');

  const statusFilter = filterValues.status as string[] | undefined;
  const apiFilters = {
    status: statusFilter && statusFilter.length === 1 ? statusFilter[0] : undefined,
  };

  const { data, isLoading } = useExitClearances(apiFilters);
  const clearances = data ?? [];

  const { data: employeesData } = useEmployees();
  const employees = Array.isArray(employeesData) ? employeesData : [];

  const createClearance = useCreateExitClearance();

  const inProgressCount = clearances.filter((c) => c.status === 'in_progress').length;
  const clearedCount = clearances.filter((c) => c.status === 'cleared').length;
  const settledCount = clearances.filter((c) => c.status === 'settled').length;

  const resetForm = () => {
    setEmployeeId('');
    setResignationDate('');
    setLastWorkingDate('');
    setReason('');
  };

  const handleCreate = () => {
    if (!employeeId) {
      toast.error('Please select an employee');
      return;
    }
    createClearance.mutate(
      {
        employeeId,
        resignationDate: resignationDate || undefined,
        lastWorkingDate: lastWorkingDate || undefined,
        reason: reason || undefined,
      },
      {
        onSuccess: (created) => {
          toast.success('Exit clearance created');
          setDialogOpen(false);
          resetForm();
          router.push(`/hr/exit-clearances/${created.id}`);
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create exit clearance')),
      },
    );
  };

  return (
    <>
      <ListPage
        title="Exit Clearance"
        subtitle="Manage employee exit clearance & full-and-final settlement"
        breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Exit Clearance' }]}
        toolbarActions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Clearance
          </Button>
        }
        summaryCards={[
          { label: 'In Progress', value: inProgressCount },
          { label: 'Cleared', value: clearedCount },
          { label: 'Settled', value: settledCount },
        ]}
        filterConfig={filterConfig}
        filterValues={filterValues}
        onFilterChange={useCallback((key: string, value: unknown) => {
          setFilterValues((prev) => ({ ...prev, [key]: value }));
        }, [])}
        onFilterClear={useCallback(() => setFilterValues({}), [])}
      >
        <DataTable
          columns={columns}
          data={clearances}
          isLoading={isLoading}
          searchPlaceholder="Search exit clearances..."
          searchValue={search}
          onSearchChange={setSearch}
          onRowClick={(row) => router.push(`/hr/exit-clearances/${row.id}`)}
          emptyMessage="No exit clearances found."
          emptyAction={{ label: 'Create Clearance', onClick: () => setDialogOpen(true) }}
        />
      </ListPage>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Exit Clearance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name || `${emp.firstName} ${emp.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Resignation Date</Label>
                <Input
                  type="date"
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Working Date</Label>
                <Input
                  type="date"
                  value={lastWorkingDate}
                  onChange={(e) => setLastWorkingDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for exit..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createClearance.isPending}>
              {createClearance.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
