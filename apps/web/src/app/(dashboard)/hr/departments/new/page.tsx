'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useCreateDepartment, useDepartments, useEmployees } from '@/hooks/use-hr';

interface FormData {
  name: string;
  code: string;
  description: string;
  parentId: string;
  managerId: string;
  isActive: boolean;
}

const initialForm: FormData = {
  name: '',
  code: '',
  description: '',
  parentId: '',
  managerId: '',
  isActive: true,
};

export default function NewDepartmentPage() {
  const router = useRouter();
  const create = useCreateDepartment();
  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();
  const allDepartments = departments ?? [];
  const allEmployees = employees ?? [];

  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.name.length > 255) errs.name = 'Name must be at most 255 characters';
    if (!form.code.trim()) errs.code = 'Code is required';
    if (form.code.length > 50) errs.code = 'Code must be at most 50 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // Build payload — only DTO-accepted fields, omit empty optional UUIDs
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      isActive: form.isActive,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.parentId) payload.parentId = form.parentId;
    if (form.managerId) payload.managerId = form.managerId;

    try {
      await create.mutateAsync(payload);
      toast.success('Department created');
      router.push('/hr/departments');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create department';
      toast.error(msg);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/hr/departments">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Department</h1>
          <p className="text-sm text-muted-foreground">Add a department to your org structure</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Department Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Code *</label>
              <Input
                value={form.code}
                onChange={(e) => update('code', e.target.value.toUpperCase())}
                placeholder="e.g., ENG, HR, FIN"
                maxLength={50}
                className="font-mono"
              />
              {errors.code && <p className="mt-1 text-xs text-destructive">{errors.code}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g., Engineering"
                maxLength={255}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="What does this department do?"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Parent Department</label>
              <Select
                value={form.parentId || 'none'}
                onValueChange={(v) => update('parentId', v === 'none' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="No parent (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {allDepartments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Manager</label>
              <Select
                value={form.managerId || 'none'}
                onValueChange={(v) => update('managerId', v === 'none' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select manager (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {allEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update('isActive', e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="isActive" className="text-sm font-medium">Active</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/hr/departments"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Department'}
          </Button>
        </div>
      </form>
    </div>
  );
}
