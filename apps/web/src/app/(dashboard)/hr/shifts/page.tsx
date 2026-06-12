'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusDot } from '@/components/ui/status-dot';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useShifts, useCreateShift, type Shift } from '@/hooks/use-shifts';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatWeekendDays(days: number[]): string {
  if (!days || days.length === 0) return 'None';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(', ');
}

export default function ShiftsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [weekendDays, setWeekendDays] = useState<number[]>([0, 6]);
  const [isActive, setIsActive] = useState(true);

  const { data, isLoading } = useShifts();
  const createMutation = useCreateShift();

  const shifts: Shift[] = data ?? [];
  const totalCount = shifts.length;
  const activeCount = shifts.filter((s) => s.isActive).length;

  const resetForm = () => {
    setName('');
    setCode('');
    setStartTime('09:00');
    setEndTime('18:00');
    setBreakMinutes(60);
    setWeekendDays([0, 6]);
    setIsActive(true);
  };

  const handleCreate = () => {
    if (!name || !code || !startTime || !endTime) {
      toast.error('Please fill all required fields');
      return;
    }
    createMutation.mutate(
      {
        name,
        code,
        startTime,
        endTime,
        breakMinutes,
        weekendDays,
        isActive,
      },
      {
        onSuccess: () => {
          toast.success('Shift created');
          setOpen(false);
          resetForm();
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create shift')),
      },
    );
  };

  const toggleWeekendDay = (day: number) => {
    setWeekendDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const columns: ColumnDef<Shift, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <Link
            href={`/hr/shifts/${row.original.id}`}
            className="text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
          <div className="font-mono text-xs text-muted-foreground">{row.original.code}</div>
        </div>
      ),
    },
    {
      accessorKey: 'startTime',
      header: 'Start',
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.startTime}</span>,
    },
    {
      accessorKey: 'endTime',
      header: 'End',
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.endTime}</span>,
    },
    {
      accessorKey: 'breakMinutes',
      header: 'Break (min)',
      cell: ({ row }) => <span className="text-sm">{row.original.breakMinutes}</span>,
    },
    {
      accessorKey: 'weekendDays',
      header: 'Weekend',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatWeekendDays(row.original.weekendDays)}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusDot
          status={row.original.isActive ? 'success' : 'muted'}
          label={row.original.isActive ? 'Active' : 'Inactive'}
        />
      ),
    },
  ];

  return (
    <ListPage
      title="Shifts"
      subtitle="Manage work shifts and weekly schedules"
      breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Shifts' }]}
      summaryCards={[
        { label: 'Total Shifts', value: totalCount },
        { label: 'Active', value: activeCount },
      ]}
      toolbarActions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Day Shift"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. DAY"
                  maxLength={20}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="breakMinutes">Break (minutes)</Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  min={0}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Weekend Days</Label>
                <div className="flex flex-wrap gap-3">
                  {DAY_LABELS.map((label, idx) => (
                    <label key={idx} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={weekendDays.includes(idx)}
                        onCheckedChange={() => toggleWeekendDay(idx)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <DataTable
        columns={columns}
        data={shifts}
        isLoading={isLoading}
        searchPlaceholder="Search shifts..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={(row) => router.push(`/hr/shifts/${row.id}`)}
        emptyMessage="No shifts found. Create one to get started."
      />
    </ListPage>
  );
}
