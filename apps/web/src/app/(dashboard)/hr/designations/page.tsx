'use client';

import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useDesignations,
  useCreateDesignation,
  useDeleteDesignation,
  type Designation,
} from '@/hooks/use-hr';
import { apiErrorMessage } from '@/lib/api';

interface FormData {
  name: string;
  description: string;
  level: string; // text input — converted to int on submit
}

const initialForm: FormData = { name: '', description: '', level: '0' };

export default function DesignationsPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const { data, isLoading } = useDesignations();
  const create = useCreateDesignation();
  const del = useDeleteDesignation();
  const designations = data ?? [];

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.name.length > 255) errs.name = 'Name must be at most 255 characters';
    if (form.level && !/^-?\d+$/.test(form.level.trim())) errs.level = 'Level must be an integer';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    const payload: Record<string, unknown> = { name: form.name.trim() };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.level.trim()) payload.level = parseInt(form.level.trim(), 10);

    try {
      await create.mutateAsync(payload);
      toast.success('Designation created');
      setForm(initialForm);
      setErrors({});
      setOpen(false);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Failed to create designation'));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this designation?')) return;
    try {
      await del.mutateAsync(id);
      toast.success('Designation deleted');
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Failed to delete designation'));
    }
  }

  const columns: ColumnDef<Designation, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'level',
      header: ({ column }) => <SortableHeader column={column}>Level</SortableHeader>,
      cell: ({ row }) => <span className="text-sm font-mono">{row.original.level ?? 0}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.original.id);
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <>
      <ListPage
        title="Designations"
        subtitle="Job titles and seniority levels"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Designations' },
        ]}
        summaryCards={[
          { label: 'Total Designations', value: designations.length },
        ]}
        toolbarActions={
          <Button size="sm" onClick={() => setOpen(true)}>
            New Designation
          </Button>
        }
      >
        <DataTable
          columns={columns}
          data={designations}
          isLoading={isLoading}
          searchPlaceholder="Search designations..."
          searchValue={search}
          onSearchChange={setSearch}
          emptyMessage="No designations defined yet."
          emptyAction={{ label: 'Create Designation', onClick: () => setOpen(true) }}
        />
      </ListPage>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Designation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Senior Software Engineer"
                maxLength={255}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Level</label>
              <Input
                type="number"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                placeholder="0"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Higher number = more senior. Used for org chart ordering.
              </p>
              {errors.level && <p className="mt-1 text-xs text-destructive">{errors.level}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="What does this role do?"
              />
            </div>
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
