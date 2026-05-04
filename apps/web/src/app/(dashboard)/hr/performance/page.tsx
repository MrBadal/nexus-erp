'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useReviewCycles, useCreateReviewCycle, type ReviewCycle } from '@/hooks/use-performance';
import { formatDate } from '@/lib/utils';

const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'warning',
  open: 'success',
  review: 'info',
  closed: 'danger',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Open', value: 'open' },
      { label: 'In Review', value: 'review' },
      { label: 'Closed', value: 'closed' },
    ],
  },
];

const columns: ColumnDef<ReviewCycle>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <SortableHeader column={column} title="Cycle Name" />,
    cell: ({ row }) => (
      <Link href={`/hr/performance/cycles/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'startDate',
    header: 'Start',
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: 'endDate',
    header: 'End',
    cell: ({ row }) => formatDate(row.original.endDate),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusDot status={statusVariant[row.original.status] || 'info'} label={row.original.status} />
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <SortableHeader column={column} title="Created" />,
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export default function PerformanceCyclesPage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const { data, isLoading } = useReviewCycles(filterValues as { status?: string });
  const cycles = (data as ReviewCycle[] | undefined) ?? [];

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const createCycle = useCreateReviewCycle();

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleFilterClear = useCallback(() => setFilterValues({}), []);

  const handleSubmit = async () => {
    if (!name || !startDate || !endDate) return;
    await createCycle.mutateAsync({ name, startDate, endDate });
    setOpen(false);
    setName('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <ListPage
      title="Performance Cycles"
      subtitle="Manage review cycles, KRA templates, and goal-setting"
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
      toolbarActions={
        <div className="flex gap-2">
          <Link href="/hr/performance/templates">
            <Button variant="outline">KRA Templates</Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New Cycle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Review Cycle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="H1 2026 Performance Review" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start">Start Date</Label>
                    <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="end">End Date</Label>
                    <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createCycle.isPending || !name || !startDate || !endDate}>
                  {createCycle.isPending ? 'Creating...' : 'Create Cycle'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={cycles}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/hr/performance/cycles/${row.id}`)}
        emptyMessage="No review cycles yet. Create your first cycle to begin performance management."
      />
    </ListPage>
  );
}
