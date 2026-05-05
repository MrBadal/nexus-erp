'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useDepartments,
  useEmployees,
} from '@/hooks/use-hr';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const departmentId = params.id;

  const { data: department, isLoading, error } = useDepartment(departmentId);
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();
  const { data: allDepartments } = useDepartments();
  const { data: allEmployees } = useEmployees();

  const [form, setForm] = useState({
    name: '',
    description: '',
    parentId: '',
    managerId: '',
  });

  useEffect(() => {
    if (department) {
      setForm({
        name: department.name ?? '',
        description: (department as { description?: string | null }).description ?? '',
        parentId: department.parentId ?? '',
        managerId: department.managerId ?? '',
      });
    }
  }, [department]);

  // Filter out this department from parent options
  const parentOptions = (allDepartments ?? []).filter((d) => d.id !== departmentId);
  const employees = allEmployees ?? [];

  function handleSave() {
    if (!department) return;
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    // Build update payload — only DTO-accepted fields, omit empty optional UUIDs
    const payload: Record<string, unknown> = { name: form.name.trim() };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.parentId) payload.parentId = form.parentId;
    if (form.managerId) payload.managerId = form.managerId;

    updateMutation.mutate(
      { id: departmentId, data: payload },
      {
        onSuccess: () => toast.success('Department saved'),
        onError: () => toast.error('Failed to save department'),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(departmentId, {
      onSuccess: () => {
        toast.success('Department deleted');
        router.push('/hr/departments');
      },
      onError: () => toast.error('Failed to delete department'),
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

  if (error || !department) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading department' : 'Department not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/hr/departments')}
          >
            Back to departments
          </button>
        </div>
      </div>
    );
  }

  const meta = [
    { label: 'Code', value: <span className="font-mono">{department.code}</span> },
    { label: 'Manager', value: department.manager || 'N/A' },
    { label: 'Headcount', value: String(department.headcount ?? 0) },
    { label: 'Created at', value: formatDate(department.createdAt) },
  ];

  return (
    <FormPage
      title={department.name}
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Departments', href: '/hr/departments' },
        { label: department.name },
      ]}
      backHref="/hr/departments"
      primaryAction={{ label: 'Save', onClick: handleSave, loading: updateMutation.isPending }}
      dangerAction={{ label: 'Delete', onClick: handleDelete, disabled: deleteMutation.isPending }}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Department Details" columns={2}>
          <FormField label="Code">
            <Input value={department.code} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Department name"
              maxLength={255}
            />
          </FormField>
          <FormField label="Description" className="md:col-span-2">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Department description"
              rows={3}
            />
          </FormField>
          <FormField label="Parent Department">
            <Select
              value={form.parentId || 'none'}
              onValueChange={(v) => setForm({ ...form, parentId: v === 'none' ? '' : v })}
            >
              <SelectTrigger><SelectValue placeholder="No parent (top-level)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (top-level)</SelectItem>
                {parentOptions.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Manager">
            <Select
              value={form.managerId || 'none'}
              onValueChange={(v) => setForm({ ...form, managerId: v === 'none' ? '' : v })}
            >
              <SelectTrigger><SelectValue placeholder="Select manager (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
