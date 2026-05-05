'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCreateCandidate, useJobOpenings, type JobOpening } from '@/hooks/use-recruitment';

// Indian mobile: 10 digits starting 6-9, optional +91/91/0 prefix, may include spaces or dashes
const PHONE_REGEX = /^(\+?91[\s-]?|0)?[6-9][\s-]?[0-9]{4}[\s-]?[0-9]{5}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormData {
  jobOpeningId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentCompany: string;
  currentDesignation: string;
  experienceYears: string;
  currentSalary: string;
  expectedSalary: string;
  source: string;
  notes: string;
}

const SOURCE_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'naukri', label: 'Naukri' },
  { value: 'referral', label: 'Referral' },
  { value: 'career_page', label: 'Career Page' },
  { value: 'campus', label: 'Campus' },
  { value: 'agency', label: 'Agency' },
  { value: 'other', label: 'Other' },
];

export default function NewCandidatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJobId = searchParams.get('jobId') || '';
  const create = useCreateCandidate();
  const { data: jobsData } = useJobOpenings({ status: 'open' });
  const jobs = (jobsData as JobOpening[] | undefined) ?? [];

  const [form, setForm] = useState<FormData>({
    jobOpeningId: preselectedJobId,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentCompany: '',
    currentDesignation: '',
    experienceYears: '',
    currentSalary: '',
    expectedSalary: '',
    source: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function validate(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.jobOpeningId) errs.jobOpeningId = 'Job opening is required';
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      errs.email = 'Invalid email address';
    }
    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {
      errs.phone = 'Phone must be a 10-digit Indian mobile (6/7/8/9 prefix), optionally with +91';
    }
    if (form.experienceYears && (parseInt(form.experienceYears, 10) < 0 || isNaN(parseInt(form.experienceYears, 10)))) {
      errs.experienceYears = 'Experience must be a non-negative integer';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // Normalize phone: strip spaces/dashes
    const phoneClean = form.phone.trim().replace(/[\s-]/g, '');

    const payload: Record<string, unknown> = {
      jobOpeningId: form.jobOpeningId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
    };
    if (phoneClean) payload.phone = phoneClean;
    if (form.currentCompany.trim()) payload.currentCompany = form.currentCompany.trim();
    if (form.currentDesignation.trim()) payload.currentDesignation = form.currentDesignation.trim();
    if (form.experienceYears) payload.experienceYears = parseInt(form.experienceYears, 10);
    if (form.currentSalary) payload.currentSalary = form.currentSalary;
    if (form.expectedSalary) payload.expectedSalary = form.expectedSalary;
    if (form.source) payload.source = form.source;
    if (form.notes.trim()) payload.notes = form.notes.trim();

    try {
      await create.mutateAsync(payload);
      toast.success('Candidate added');
      router.push('/hr/recruitment/candidates');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add candidate';
      toast.error(msg);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/hr/recruitment/candidates">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Candidate</h1>
          <p className="text-sm text-muted-foreground">Register a new candidate application</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Job & Personal Info</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Job Opening *</label>
              <select
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.jobOpeningId}
                onChange={(e) => setForm({ ...form, jobOpeningId: e.target.value })}
              >
                <option value="">Select job opening...</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              {errors.jobOpeningId && <p className="mt-1 text-xs text-destructive">{errors.jobOpeningId}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="tel"
                inputMode="tel"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
              {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Professional Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Current Company</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.currentCompany}
                onChange={(e) => setForm({ ...form, currentCompany: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Current Designation</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.currentDesignation}
                onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Experience (years)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
              />
              {errors.experienceYears && <p className="mt-1 text-xs text-destructive">{errors.experienceYears}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Source</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="">Select source...</option>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Current Salary (CTC INR)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.currentSalary}
                onChange={(e) => setForm({ ...form, currentSalary: e.target.value })}
                placeholder="e.g., 800000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expected Salary (CTC INR)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.expectedSalary}
                onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })}
                placeholder="e.g., 1200000"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Notes</h2>
          <textarea
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes about the candidate..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/hr/recruitment/candidates"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Adding...' : 'Add Candidate'}
          </Button>
        </div>
      </form>
    </div>
  );
}
