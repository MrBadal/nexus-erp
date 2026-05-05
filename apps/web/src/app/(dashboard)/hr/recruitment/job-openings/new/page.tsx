'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCreateJobOpening } from '@/hooks/use-recruitment';
import { useDepartments, useDesignations } from '@/hooks/use-hr';

interface FormData {
  title: string;
  departmentId: string;
  designationId: string;
  positions: number;
  description: string;
  requirements: string;
  location: string;
  employmentType: string;
  minSalary: string;
  maxSalary: string;
  closingDate: string;
}

const initialForm: FormData = {
  title: '',
  departmentId: '',
  designationId: '',
  positions: 1,
  description: '',
  requirements: '',
  location: '',
  employmentType: 'full_time',
  minSalary: '',
  maxSalary: '',
  closingDate: '',
};

export default function NewJobOpeningPage() {
  const router = useRouter();
  const create = useCreateJobOpening();
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const allDepartments = departments ?? [];
  const allDesignations = designations ?? [];

  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.positions < 1) errs.positions = 'At least 1 position required';
    if (form.minSalary && form.maxSalary) {
      const minN = parseFloat(form.minSalary);
      const maxN = parseFloat(form.maxSalary);
      if (minN > maxN) errs.maxSalary = 'Max salary must be ≥ min salary';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // Build payload — only DTO-accepted fields, omit empty optional UUIDs
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      positions: form.positions,
      employmentType: form.employmentType,
    };
    if (form.departmentId) payload.departmentId = form.departmentId;
    if (form.designationId) payload.designationId = form.designationId;
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.requirements.trim()) payload.requirements = form.requirements.trim();
    if (form.location.trim()) payload.location = form.location.trim();
    if (form.minSalary) payload.minSalary = form.minSalary;
    if (form.maxSalary) payload.maxSalary = form.maxSalary;
    if (form.closingDate) payload.closingDate = form.closingDate;

    try {
      await create.mutateAsync(payload);
      toast.success('Job opening created');
      router.push('/hr/recruitment/job-openings');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create job opening';
      toast.error(msg);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/hr/recruitment/job-openings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Job Opening</h1>
          <p className="text-sm text-muted-foreground">Create a new recruitment position</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Position Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Job Title *</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Senior Software Engineer"
              />
              {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">Select department...</option>
                {allDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Designation</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.designationId}
                onChange={(e) => setForm({ ...form, designationId: e.target.value })}
              >
                <option value="">Select designation...</option>
                {allDesignations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Number of Positions</label>
              <input
                type="number"
                min="1"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.positions}
                onChange={(e) => setForm({ ...form, positions: parseInt(e.target.value) || 1 })}
              />
              {errors.positions && <p className="mt-1 text-xs text-destructive">{errors.positions}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Employment Type</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., Bengaluru, Mumbai, Remote"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Closing Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.closingDate}
                onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Min Salary (CTC INR)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.minSalary}
                onChange={(e) => setForm({ ...form, minSalary: e.target.value })}
                placeholder="e.g., 600000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Salary (CTC INR)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.maxSalary}
                onChange={(e) => setForm({ ...form, maxSalary: e.target.value })}
                placeholder="e.g., 1200000"
              />
              {errors.maxSalary && <p className="mt-1 text-xs text-destructive">{errors.maxSalary}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Description & Requirements</h2>
          <div>
            <label className="text-sm font-medium">Job Description</label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the role, responsibilities..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Requirements</label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              placeholder="Skills, qualifications, experience..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/hr/recruitment/job-openings"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating...' : 'Create Job Opening'}
          </Button>
        </div>
      </form>
    </div>
  );
}
