'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api, { endpoints } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  useEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useDepartments,
  useDesignations,
  useEmployees,
  useLeaveApplications,
  useAttendance,
  usePayrollEntries,
  type Employee,
} from '@/hooks/use-hr';
import {
  useEmployeeDocuments,
  useCreateEmployeeDocument,
  useDeleteEmployeeDocument,
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  type EmployeeDocumentType,
} from '@/hooks/use-employee-documents';
import {
  useEmployeeEducation,
  useCreateEmployeeEducation,
  useDeleteEmployeeEducation,
} from '@/hooks/use-employee-education';
import {
  useEmployeeExperience,
  useCreateEmployeeExperience,
  useDeleteEmployeeExperience,
} from '@/hooks/use-employee-experience';
import {
  useEmployeeFamily,
  useCreateEmployeeFamily,
  useDeleteEmployeeFamily,
  EMPLOYEE_FAMILY_RELATIONSHIPS,
  EMPLOYEE_FAMILY_RELATIONSHIP_LABELS,
  type EmployeeFamilyRelationship,
} from '@/hooks/use-employee-family';
import {
  useEmployeeSkills,
  useCreateEmployeeSkill,
  useDeleteEmployeeSkill,
  EMPLOYEE_SKILL_PROFICIENCIES,
  EMPLOYEE_SKILL_PROFICIENCY_LABELS,
  type EmployeeSkillProficiency,
} from '@/hooks/use-employee-skills';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type EmployeeStatus = Employee['status'];

const statusVariantMap: Record<EmployeeStatus, 'success' | 'warning' | 'muted' | 'danger'> = {
  active: 'success',
  inactive: 'muted',
  terminated: 'danger',
  on_leave: 'warning',
};

const statusLabelMap: Record<EmployeeStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
  on_leave: 'On Leave',
};

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

const employmentTypeOptions = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

// ---------------------------------------------------------------------------
// Cross-module tab sub-components
// ---------------------------------------------------------------------------

function DocumentsTab({ employeeId }: { employeeId: string }) {
  type DocType = EmployeeDocumentType;
  const { data: docs, isLoading } = useEmployeeDocuments({ employeeId });
  const createMut = useCreateEmployeeDocument();
  const deleteMut = useDeleteEmployeeDocument();
  const [form, setForm] = useState<{
    type: DocType;
    name: string;
    fileUrl: string;
    notes: string;
    visibleToEmployee: boolean;
  }>({
    type: 'offer_letter' as DocType,
    name: '',
    fileUrl: '',
    notes: '',
    visibleToEmployee: true,
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.fileUrl.trim()) {
      toast.error('Document name and file URL are required');
      return;
    }
    createMut.mutate(
      {
        employeeId,
        type: form.type,
        name: form.name.trim(),
        fileUrl: form.fileUrl.trim(),
        notes: form.notes.trim() || undefined,
        visibleToEmployee: form.visibleToEmployee,
      },
      {
        onSuccess: () => {
          toast.success('Document uploaded');
          setForm({
            type: 'offer_letter' as DocType,
            name: '',
            fileUrl: '',
            notes: '',
            visibleToEmployee: true,
          });
        },
        onError: (err: Error) => toast.error(err.message || 'Upload failed'),
      },
    );
  };

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={handleUpload} className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-medium">
          Upload a document for this employee
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Type</label>
          <Select
            value={form.type}
            onValueChange={(v) => setForm((f) => ({ ...f, type: v as DocType }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(EMPLOYEE_DOCUMENT_TYPE_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Name *</label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Offer Letter — Mar 2026" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">File URL *</label>
          <Input value={form.fileUrl} onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))} placeholder="https://..." />
          <p className="text-[11px] text-muted-foreground">Paste a public/cloud URL for the document. Direct upload coming soon.</p>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Notes (optional)</label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional context" />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={form.visibleToEmployee}
            onChange={(e) => setForm((f) => ({ ...f, visibleToEmployee: e.target.checked }))}
          />
          Visible to employee in their portal
        </label>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading documents…</p>
      ) : (docs ?? []).length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No documents yet for this employee.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <th className="px-4 py-2">Document</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Visible</th>
              <th className="px-4 py-2">Uploaded</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(docs ?? []).map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium">{d.name}</div>
                  {d.notes && <div className="text-xs text-muted-foreground">{d.notes}</div>}
                </td>
                <td className="px-4 py-2">{EMPLOYEE_DOCUMENT_TYPE_LABELS[d.type] ?? d.type}</td>
                <td className="px-4 py-2">{d.visibleToEmployee ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-muted-foreground">{formatDate(d.uploadedAt)}</td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-3 text-xs text-primary underline"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${d.name}"?`)) {
                        deleteMut.mutate(d.id, {
                          onSuccess: () => toast.success('Document removed'),
                          onError: (e: Error) => toast.error(e.message || 'Failed'),
                        });
                      }
                    }}
                    className="text-xs text-destructive underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LeaveTab({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const { data } = useLeaveApplications({ employeeId } as Record<string, string>);
  const leaves = (data as Record<string, unknown>[] | undefined) ?? [];
  if (!leaves.length) return <p className="p-4 text-sm text-muted-foreground">No leave applications found for this employee.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50">
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Leave Type</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">From</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">To</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Days</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
      </tr></thead>
      <tbody>
        {leaves.map((l) => (
          <tr key={l.id as string} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/hr/leave/${l.id}`)}>
            <td className="px-4 py-2">{(l.leaveType || '') as string}</td>
            <td className="px-4 py-2 text-muted-foreground">{(l.fromDate || '') as string}</td>
            <td className="px-4 py-2 text-muted-foreground">{(l.toDate || '') as string}</td>
            <td className="px-4 py-2">{(l.totalDays || 0) as number}</td>
            <td className="px-4 py-2"><span className="capitalize text-xs">{(l.status || '') as string}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AttendanceTab({ employeeId }: { employeeId: string }) {
  const { data } = useAttendance({ employeeId } as Record<string, string>);
  const records = (data as Record<string, unknown>[] | undefined) ?? [];
  if (!records.length) return <p className="p-4 text-sm text-muted-foreground">No attendance records found for this employee.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50">
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Check In</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Check Out</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
      </tr></thead>
      <tbody>
        {records.map((a) => (
          <tr key={a.id as string} className="border-b hover:bg-muted/30">
            <td className="px-4 py-2">{(a.attendanceDate || a.date || '') as string}</td>
            <td className="px-4 py-2 text-muted-foreground">{(a.checkIn || '—') as string}</td>
            <td className="px-4 py-2 text-muted-foreground">{(a.checkOut || '—') as string}</td>
            <td className="px-4 py-2"><span className="capitalize text-xs">{(a.status || '') as string}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PayrollTab({ employeeId }: { employeeId: string }) {
  const { data } = usePayrollEntries({ employeeId } as Record<string, string>);
  const entries = (data as Record<string, unknown>[] | undefined) ?? [];
  if (!entries.length) return <p className="p-4 text-sm text-muted-foreground">No payroll entries found for this employee.</p>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b bg-muted/50">
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Period</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Gross Pay</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Deductions</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Net Pay</th>
        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
      </tr></thead>
      <tbody>
        {entries.map((p) => (
          <tr key={p.id as string} className="border-b hover:bg-muted/30">
            <td className="px-4 py-2">{(p.period || '') as string}</td>
            <td className="px-4 py-2">{(p.grossPay || 0) as number}</td>
            <td className="px-4 py-2 text-muted-foreground">{(p.deductions || 0) as number}</td>
            <td className="px-4 py-2 font-medium">{(p.netPay || 0) as number}</td>
            <td className="px-4 py-2"><span className="capitalize text-xs">{(p.status || '') as string}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EducationTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeEducation({ employeeId });
  const createMut = useCreateEmployeeEducation();
  const deleteMut = useDeleteEmployeeEducation();
  const [form, setForm] = useState({
    degree: '',
    institution: '',
    fieldOfStudy: '',
    startYear: '',
    endYear: '',
    grade: '',
    notes: '',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.degree.trim() || !form.institution.trim() || !form.startYear.trim()) {
      toast.error('Degree, institution, and start year are required');
      return;
    }
    const startYear = Number(form.startYear);
    if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 2100) {
      toast.error('Start year must be between 1900 and 2100');
      return;
    }
    let endYear: number | undefined;
    if (form.endYear.trim()) {
      endYear = Number(form.endYear);
      if (!Number.isInteger(endYear) || endYear < 1900 || endYear > 2100) {
        toast.error('End year must be between 1900 and 2100');
        return;
      }
    }
    createMut.mutate(
      {
        employeeId,
        degree: form.degree.trim(),
        institution: form.institution.trim(),
        fieldOfStudy: form.fieldOfStudy.trim() || undefined,
        startYear,
        endYear,
        grade: form.grade.trim() || undefined,
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Education added');
          setForm({ degree: '', institution: '', fieldOfStudy: '', startYear: '', endYear: '', grade: '', notes: '' });
        },
        onError: (err: Error) => toast.error(err.message || 'Failed'),
      },
    );
  };

  const entries = data ?? [];

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={handleAdd} className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-medium">Add education entry</div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Degree *</label>
          <Input value={form.degree} onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))} placeholder="e.g. B.Tech" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Institution *</label>
          <Input value={form.institution} onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))} placeholder="e.g. IIT Delhi" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Field of Study</label>
          <Input value={form.fieldOfStudy} onChange={(e) => setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} placeholder="e.g. Computer Science" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Grade</label>
          <Input value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} placeholder="e.g. 8.5 CGPA" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Start Year *</label>
          <Input type="number" min={1900} max={2100} value={form.startYear} onChange={(e) => setForm((f) => ({ ...f, startYear: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">End Year</label>
          <Input type="number" min={1900} max={2100} value={form.endYear} onChange={(e) => setForm((f) => ({ ...f, endYear: e.target.value }))} placeholder="Leave blank if ongoing" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Notes</label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? 'Adding…' : 'Add entry'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No education entries yet for this employee.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <th className="px-4 py-2">Degree</th>
              <th className="px-4 py-2">Institution</th>
              <th className="px-4 py-2">Field</th>
              <th className="px-4 py-2">Years</th>
              <th className="px-4 py-2">Grade</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{e.degree}</td>
                <td className="px-4 py-2">{e.institution}</td>
                <td className="px-4 py-2 text-muted-foreground">{e.fieldOfStudy ?? '—'}</td>
                <td className="px-4 py-2 tabular-nums">{e.startYear} – {e.endYear ?? 'Present'}</td>
                <td className="px-4 py-2 text-muted-foreground">{e.grade ?? '—'}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${e.degree}"?`)) {
                        deleteMut.mutate(e.id, {
                          onSuccess: () => toast.success('Education removed'),
                          onError: (err: Error) => toast.error(err.message || 'Failed'),
                        });
                      }
                    }}
                    className="text-xs text-destructive underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ExperienceTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeExperience({ employeeId });
  const createMut = useCreateEmployeeExperience();
  const deleteMut = useDeleteEmployeeExperience();
  const [form, setForm] = useState({
    companyName: '',
    title: '',
    fromDate: '',
    toDate: '',
    employmentType: '',
    description: '',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.title.trim() || !form.fromDate) {
      toast.error('Company, title, and start date are required');
      return;
    }
    createMut.mutate(
      {
        employeeId,
        companyName: form.companyName.trim(),
        title: form.title.trim(),
        fromDate: form.fromDate,
        toDate: form.toDate || undefined,
        employmentType: form.employmentType.trim() || undefined,
        description: form.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Experience added');
          setForm({ companyName: '', title: '', fromDate: '', toDate: '', employmentType: '', description: '' });
        },
        onError: (err: Error) => toast.error(err.message || 'Failed'),
      },
    );
  };

  const entries = data ?? [];

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={handleAdd} className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-medium">Add work experience</div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Company *</label>
          <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Title *</label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">From *</label>
          <Input type="date" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">To</label>
          <Input type="date" value={form.toDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} placeholder="Leave blank if current" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Employment Type</label>
          <Input value={form.employmentType} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))} placeholder="e.g. full_time, contract" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Description</label>
          <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? 'Adding…' : 'Add entry'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No experience entries yet for this employee.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium">{e.title}</div>
                  {e.description && <div className="text-xs text-muted-foreground line-clamp-1">{e.description}</div>}
                </td>
                <td className="px-4 py-2">{e.companyName}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {formatDate(e.fromDate)} – {e.toDate ? formatDate(e.toDate) : 'Present'}
                </td>
                <td className="px-4 py-2 capitalize text-muted-foreground">
                  {e.employmentType ? e.employmentType.replace(/_/g, ' ') : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${e.title} @ ${e.companyName}"?`)) {
                        deleteMut.mutate(e.id, {
                          onSuccess: () => toast.success('Experience removed'),
                          onError: (err: Error) => toast.error(err.message || 'Failed'),
                        });
                      }
                    }}
                    className="text-xs text-destructive underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FamilyTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeFamily({ employeeId });
  const createMut = useCreateEmployeeFamily();
  const deleteMut = useDeleteEmployeeFamily();
  const [form, setForm] = useState<{
    name: string;
    relationship: EmployeeFamilyRelationship;
    dateOfBirth: string;
    nominee: boolean;
    nomineeSharePercent: string;
    aadhaarNumber: string;
    contactPhone: string;
    notes: string;
  }>({
    name: '',
    relationship: 'spouse',
    dateOfBirth: '',
    nominee: false,
    nomineeSharePercent: '',
    aadhaarNumber: '',
    contactPhone: '',
    notes: '',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    let nomineeSharePercent: number | undefined;
    if (form.nomineeSharePercent.trim()) {
      nomineeSharePercent = Number(form.nomineeSharePercent);
      if (!Number.isInteger(nomineeSharePercent) || nomineeSharePercent < 0 || nomineeSharePercent > 100) {
        toast.error('Nominee share must be 0–100');
        return;
      }
    }
    const aadhaar = form.aadhaarNumber.replace(/[\s-]/g, '');
    if (aadhaar && !/^[2-9][0-9]{11}$/.test(aadhaar)) {
      toast.error('Aadhaar must be 12 digits and not start with 0 or 1');
      return;
    }
    createMut.mutate(
      {
        employeeId,
        name: form.name.trim(),
        relationship: form.relationship,
        dateOfBirth: form.dateOfBirth || undefined,
        nominee: form.nominee,
        nomineeSharePercent,
        aadhaarNumber: aadhaar || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Family entry added');
          setForm({
            name: '',
            relationship: 'spouse',
            dateOfBirth: '',
            nominee: false,
            nomineeSharePercent: '',
            aadhaarNumber: '',
            contactPhone: '',
            notes: '',
          });
        },
        onError: (err: Error) => toast.error(err.message || 'Failed'),
      },
    );
  };

  const entries = data ?? [];

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={handleAdd} className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-medium">Add family / nominee entry</div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Name *</label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Relationship *</label>
          <Select value={form.relationship} onValueChange={(v) => setForm((f) => ({ ...f, relationship: v as EmployeeFamilyRelationship }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYEE_FAMILY_RELATIONSHIPS.map((r) => (
                <SelectItem key={r} value={r}>{EMPLOYEE_FAMILY_RELATIONSHIP_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Date of Birth</label>
          <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Contact Phone</label>
          <Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Aadhaar</label>
          <Input value={form.aadhaarNumber} onChange={(e) => setForm((f) => ({ ...f, aadhaarNumber: e.target.value }))} maxLength={14} />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={form.nominee} onChange={(e) => setForm((f) => ({ ...f, nominee: e.target.checked }))} />
          Nominee for benefits
        </label>
        {form.nominee && (
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium">Nominee share (%)</label>
            <Input type="number" min={0} max={100} value={form.nomineeSharePercent} onChange={(e) => setForm((f) => ({ ...f, nomineeSharePercent: e.target.value }))} />
          </div>
        )}
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Notes</label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? 'Adding…' : 'Add entry'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No family entries yet for this employee.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Relationship</th>
              <th className="px-4 py-2">Date of Birth</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Nominee</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{e.name}</td>
                <td className="px-4 py-2">{EMPLOYEE_FAMILY_RELATIONSHIP_LABELS[e.relationship]}</td>
                <td className="px-4 py-2 text-muted-foreground">{e.dateOfBirth ? formatDate(e.dateOfBirth) : '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{e.contactPhone ?? '—'}</td>
                <td className="px-4 py-2">{e.nominee ? `Yes${e.nomineeSharePercent !== null ? ` · ${e.nomineeSharePercent}%` : ''}` : '—'}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${e.name}"?`)) {
                        deleteMut.mutate(e.id, {
                          onSuccess: () => toast.success('Entry removed'),
                          onError: (err: Error) => toast.error(err.message || 'Failed'),
                        });
                      }
                    }}
                    className="text-xs text-destructive underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SkillsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useEmployeeSkills({ employeeId });
  const createMut = useCreateEmployeeSkill();
  const deleteMut = useDeleteEmployeeSkill();
  const [form, setForm] = useState<{
    skill: string;
    category: string;
    proficiency: EmployeeSkillProficiency;
    yearsOfExperience: string;
    certificationName: string;
    certificationIssuer: string;
    certificationDate: string;
    certificationExpiresAt: string;
    notes: string;
  }>({
    skill: '',
    category: '',
    proficiency: 'intermediate',
    yearsOfExperience: '',
    certificationName: '',
    certificationIssuer: '',
    certificationDate: '',
    certificationExpiresAt: '',
    notes: '',
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.skill.trim()) {
      toast.error('Skill name is required');
      return;
    }
    if (form.yearsOfExperience.trim()) {
      const yrs = Number(form.yearsOfExperience);
      if (Number.isNaN(yrs) || yrs < 0 || yrs > 99) {
        toast.error('Years of experience must be a number between 0 and 99');
        return;
      }
    }
    createMut.mutate(
      {
        employeeId,
        skill: form.skill.trim(),
        category: form.category.trim() || undefined,
        proficiency: form.proficiency,
        yearsOfExperience: form.yearsOfExperience.trim() || undefined,
        certificationName: form.certificationName.trim() || undefined,
        certificationIssuer: form.certificationIssuer.trim() || undefined,
        certificationDate: form.certificationDate || undefined,
        certificationExpiresAt: form.certificationExpiresAt || undefined,
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Skill added');
          setForm({
            skill: '',
            category: '',
            proficiency: 'intermediate',
            yearsOfExperience: '',
            certificationName: '',
            certificationIssuer: '',
            certificationDate: '',
            certificationExpiresAt: '',
            notes: '',
          });
        },
        onError: (err: Error) => toast.error(err.message || 'Failed'),
      },
    );
  };

  const entries = data ?? [];

  return (
    <div className="space-y-4 p-4">
      <form onSubmit={handleAdd} className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-medium">Add skill / certification</div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Skill *</label>
          <Input value={form.skill} onChange={(e) => setForm((f) => ({ ...f, skill: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Category</label>
          <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Proficiency *</label>
          <Select value={form.proficiency} onValueChange={(v) => setForm((f) => ({ ...f, proficiency: v as EmployeeSkillProficiency }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYEE_SKILL_PROFICIENCIES.map((p) => (
                <SelectItem key={p} value={p}>{EMPLOYEE_SKILL_PROFICIENCY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Years of Experience</label>
          <Input type="number" min={0} max={99} step="0.5" value={form.yearsOfExperience} onChange={(e) => setForm((f) => ({ ...f, yearsOfExperience: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Certification Name</label>
          <Input value={form.certificationName} onChange={(e) => setForm((f) => ({ ...f, certificationName: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Issuer</label>
          <Input value={form.certificationIssuer} onChange={(e) => setForm((f) => ({ ...f, certificationIssuer: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Issued On</label>
          <Input type="date" value={form.certificationDate} onChange={(e) => setForm((f) => ({ ...f, certificationDate: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Expires On</label>
          <Input type="date" value={form.certificationExpiresAt} onChange={(e) => setForm((f) => ({ ...f, certificationExpiresAt: e.target.value }))} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-medium">Notes</label>
          <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? 'Adding…' : 'Add skill'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No skills yet for this employee.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <th className="px-4 py-2">Skill</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Proficiency</th>
              <th className="px-4 py-2">Years</th>
              <th className="px-4 py-2">Certification</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{e.skill}</td>
                <td className="px-4 py-2 text-muted-foreground">{e.category ?? '—'}</td>
                <td className="px-4 py-2">{EMPLOYEE_SKILL_PROFICIENCY_LABELS[e.proficiency]}</td>
                <td className="px-4 py-2 tabular-nums text-muted-foreground">{e.yearsOfExperience ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {e.certificationName ? (
                    <div>
                      <div>{e.certificationName}</div>
                      {e.certificationIssuer && <div className="text-xs">{e.certificationIssuer}</div>}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${e.skill}"?`)) {
                        deleteMut.mutate(e.id, {
                          onSuccess: () => toast.success('Skill removed'),
                          onError: (err: Error) => toast.error(err.message || 'Failed'),
                        });
                      }
                    }}
                    className="text-xs text-destructive underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const employeeId = params.id;

  const { data: employee, isLoading, error } = useEmployee(employeeId);
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: allEmployees } = useEmployees();

  // Editable state
  const [localFirstName, setLocalFirstName] = useState<string | null>(null);
  const [localLastName, setLocalLastName] = useState<string | null>(null);
  const [localEmail, setLocalEmail] = useState<string | null>(null);
  const [localPhone, setLocalPhone] = useState<string | null>(null);
  const [localGender, setLocalGender] = useState<string | null>(null);
  const [localDateOfBirth, setLocalDateOfBirth] = useState<string | null>(null);
  const [localNationalId, setLocalNationalId] = useState<string | null>(null);
  const [localAddress, setLocalAddress] = useState<string | null>(null);
  const [localDepartmentId, setLocalDepartmentId] = useState<string | null>(null);
  const [localDesignationId, setLocalDesignationId] = useState<string | null>(null);
  const [localManagerId, setLocalManagerId] = useState<string | null>(null);
  const [localEmploymentType, setLocalEmploymentType] = useState<string | null>(null);
  const [localDateOfJoining, setLocalDateOfJoining] = useState<string | null>(null);
  const [localDateOfLeaving, setLocalDateOfLeaving] = useState<string | null>(null);
  // Indian statutory + bank fields
  const [localPan, setLocalPan] = useState<string | null>(null);
  const [localAadhaar, setLocalAadhaar] = useState<string | null>(null);
  const [localUan, setLocalUan] = useState<string | null>(null);
  const [localEsic, setLocalEsic] = useState<string | null>(null);
  const [localTaxRegime, setLocalTaxRegime] = useState<string | null>(null);
  const [localBankName, setLocalBankName] = useState<string | null>(null);
  const [localBankAccountNumber, setLocalBankAccountNumber] = useState<string | null>(null);
  const [localBankIfsc, setLocalBankIfsc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('documents');

  const status: EmployeeStatus = employee?.status ?? 'active';

  const currentFirstName = localFirstName ?? employee?.firstName ?? '';
  const currentLastName = localLastName ?? employee?.lastName ?? '';
  const currentEmail = localEmail ?? employee?.email ?? '';
  const currentPhone = localPhone ?? employee?.phone ?? '';
  const currentGender = localGender ?? employee?.gender ?? '';
  const currentDateOfBirth = localDateOfBirth ?? employee?.dateOfBirth ?? '';
  const currentNationalId = localNationalId ?? employee?.nationalId ?? '';
  const currentAddress = localAddress ?? employee?.address ?? '';
  const currentDepartmentId = localDepartmentId ?? employee?.departmentId ?? '';
  const currentDesignationId = localDesignationId ?? employee?.designationId ?? '';
  const currentManagerId = localManagerId ?? employee?.managerId ?? '';
  const currentEmploymentType = localEmploymentType ?? employee?.employmentType ?? 'full_time';
  const currentDateOfJoining = localDateOfJoining ?? employee?.dateOfJoining ?? '';
  const currentDateOfLeaving = localDateOfLeaving ?? '';
  const currentPan = localPan ?? employee?.panNumber ?? '';
  const currentAadhaar = localAadhaar ?? employee?.aadhaarNumber ?? '';
  const currentUan = localUan ?? employee?.uanNumber ?? '';
  const currentEsic = localEsic ?? employee?.esicNumber ?? '';
  const currentTaxRegime = localTaxRegime ?? employee?.taxRegime ?? 'new';
  const currentBankName = localBankName ?? employee?.bankName ?? '';
  const currentBankAccountNumber = localBankAccountNumber ?? employee?.bankAccountNumber ?? '';
  const currentBankIfsc = localBankIfsc ?? employee?.bankIfscCode ?? '';

  function handleSave() {
    if (!employee) return;
    // Build payload from DTO-accepted fields only. Empty strings → undefined
    // so optional checks (UUIDs especially) pass class-validator.
    const opt = (v: string) => (v.trim() === '' ? undefined : v.trim());
    const payload: Record<string, unknown> = {
      firstName: currentFirstName,
      lastName: currentLastName,
      email: currentEmail,
      phone: opt(currentPhone),
      gender: opt(currentGender),
      dateOfBirth: opt(currentDateOfBirth),
      nationalId: opt(currentNationalId),
      address: opt(currentAddress),
      departmentId: opt(currentDepartmentId),
      designationId: opt(currentDesignationId),
      managerId: opt(currentManagerId),
      employmentType: currentEmploymentType,
      dateOfJoining: currentDateOfJoining,
      // Indian statutory + bank
      panNumber: opt(currentPan)?.toUpperCase(),
      aadhaarNumber: opt(currentAadhaar)?.replace(/[\s-]/g, ''),
      uanNumber: opt(currentUan),
      esicNumber: opt(currentEsic),
      taxRegime: currentTaxRegime,
      bankName: opt(currentBankName),
      bankAccountNumber: opt(currentBankAccountNumber),
      bankIfscCode: opt(currentBankIfsc)?.toUpperCase(),
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    updateMutation.mutate(
      { id: employeeId, data: payload as never },
      {
        onSuccess: () => toast.success('Employee saved'),
        onError: (err: Error) => toast.error(err.message || 'Failed to save employee'),
      },
    );
  }

  function handleActivate() {
    updateMutation.mutate(
      { id: employeeId, data: { status: 'active' } },
      {
        onSuccess: () => toast.success('Employee activated'),
        onError: () => toast.error('Failed to activate employee'),
      },
    );
  }

  function handleTerminate() {
    updateMutation.mutate(
      { id: employeeId, data: { status: 'inactive' } },
      {
        onSuccess: () => toast.success('Employee terminated'),
        onError: () => toast.error('Failed to terminate employee'),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(employeeId, {
      onSuccess: () => {
        toast.success('Employee deleted');
        router.push('/hr/employees');
      },
      onError: () => toast.error('Failed to delete employee'),
    });
  }

  // ---------- Loading / Error ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading employee' : 'Employee not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/hr/employees')}
          >
            Back to employees
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  const handleInviteToPortal = async () => {
    try {
      const { data } = await api.post<{ activationUrl: string; userId: string; created: boolean }>(
        endpoints.employees.inviteToPortal(employeeId),
      );
      if (!data.activationUrl) {
        toast.error('No activation URL returned');
        return;
      }
      await navigator.clipboard.writeText(data.activationUrl);
      toast.success(
        data.created
          ? 'Login account created — activation link copied'
          : 'Activation link refreshed and copied',
        {
          description:
            'Share this link with the employee. It is valid for 7 days and single-use.',
        },
      );
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to invite');
      toast.error(typeof msg === 'string' ? msg : 'Failed to invite');
    }
  };

  type ActionItem = {
    label: string;
    onClick: () => void | Promise<void>;
    variant: 'outline';
  };
  const secondaryActions: ActionItem[] = [
    {
      label: 'Invite to Employee Portal',
      onClick: handleInviteToPortal,
      variant: 'outline',
    },
  ];
  if (status === 'inactive') {
    secondaryActions.push({ label: 'Activate', onClick: handleActivate, variant: 'outline' });
  }
  if (status === 'active' || status === 'on_leave') {
    secondaryActions.push({ label: 'Terminate', onClick: handleTerminate, variant: 'outline' });
  }

  const meta = [
    { label: 'Employee ID', value: <span className="font-mono">{employee.employeeId}</span> },
    { label: 'Status', value: <Badge>{statusLabelMap[status]}</Badge> },
    { label: 'Department', value: employee.department || 'N/A' },
    { label: 'Joined', value: formatDate(employee.dateOfJoining) },
    { label: 'Created at', value: formatDate(employee.createdAt) },
  ];

  return (
    <FormPage
      title={`${employee.firstName} ${employee.lastName}`}
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Employees', href: '/hr/employees' },
        { label: `${employee.firstName} ${employee.lastName}` },
      ]}
      backHref="/hr/employees"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={{ label: 'Save', onClick: handleSave, loading: updateMutation.isPending }}
      secondaryActions={secondaryActions}
      dangerAction={{ label: 'Delete', onClick: handleDelete, disabled: deleteMutation.isPending }}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Personal Information */}
        <FormSection title="Personal Information" columns={2}>
          <FormField label="Employee ID">
            <Input value={employee.employeeId} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Gender">
            <Select value={currentGender} onValueChange={(v) => setLocalGender(v)}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                {genderOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="First Name">
            <Input value={currentFirstName} onChange={(e) => setLocalFirstName(e.target.value)} placeholder="First name" />
          </FormField>
          <FormField label="Last Name">
            <Input value={currentLastName} onChange={(e) => setLocalLastName(e.target.value)} placeholder="Last name" />
          </FormField>
          <FormField label="Email">
            <Input value={currentEmail} onChange={(e) => setLocalEmail(e.target.value)} placeholder="Email address" type="email" />
          </FormField>
          <FormField label="Phone">
            <Input value={currentPhone} onChange={(e) => setLocalPhone(e.target.value)} placeholder="Phone number" />
          </FormField>
          <FormField label="Date of Birth">
            <Input value={currentDateOfBirth} onChange={(e) => setLocalDateOfBirth(e.target.value)} placeholder="YYYY-MM-DD" type="date" />
          </FormField>
          <FormField label="National ID">
            <Input value={currentNationalId} onChange={(e) => setLocalNationalId(e.target.value)} placeholder="National ID number" />
          </FormField>
          <FormField label="Address" className="md:col-span-2">
            <Input value={currentAddress} onChange={(e) => setLocalAddress(e.target.value)} placeholder="Home address" />
          </FormField>
        </FormSection>

        {/* Employment Details */}
        <FormSection title="Employment Details" columns={2}>
          <FormField label="Department">
            <Select value={currentDepartmentId} onValueChange={(v) => setLocalDepartmentId(v)}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Designation">
            <Select value={currentDesignationId} onValueChange={(v) => setLocalDesignationId(v)}>
              <SelectTrigger>
                <SelectValue placeholder={designations?.length ? 'Select designation' : 'No designations yet'} />
              </SelectTrigger>
              <SelectContent>
                {designations?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Reports To (Manager)">
            <Select value={currentManagerId} onValueChange={(v) => setLocalManagerId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {(allEmployees ?? [])
                  .filter((m) => m.id !== employeeId)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.employeeId})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Employment Type">
            <Select value={currentEmploymentType} onValueChange={(v) => setLocalEmploymentType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {employmentTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Date of Joining">
            <Input value={currentDateOfJoining} onChange={(e) => setLocalDateOfJoining(e.target.value)} type="date" />
          </FormField>
          {(status === 'inactive' || currentDateOfLeaving) && (
            <FormField label="Date of Leaving">
              <Input value={currentDateOfLeaving} onChange={(e) => setLocalDateOfLeaving(e.target.value)} type="date" />
            </FormField>
          )}
        </FormSection>

        {/* Indian Statutory Identifiers */}
        <FormSection title="Indian Statutory Identifiers" columns={2}>
          <FormField label="PAN">
            <Input
              value={currentPan}
              onChange={(e) => setLocalPan(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              className="uppercase"
            />
          </FormField>
          <FormField label="Aadhaar">
            <Input
              value={currentAadhaar}
              onChange={(e) => setLocalAadhaar(e.target.value)}
              placeholder="1234 5678 9012"
              maxLength={14}
            />
          </FormField>
          <FormField label="UAN (EPFO)">
            <Input
              value={currentUan}
              onChange={(e) => setLocalUan(e.target.value)}
              placeholder="100123456789"
              maxLength={12}
            />
          </FormField>
          <FormField label="ESIC Number">
            <Input
              value={currentEsic}
              onChange={(e) => setLocalEsic(e.target.value)}
              placeholder="3300123456789012"
              maxLength={17}
            />
          </FormField>
          <FormField label="Tax Regime">
            <Select value={currentTaxRegime} onValueChange={(v) => setLocalTaxRegime(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Regime (default)</SelectItem>
                <SelectItem value="old">Old Regime</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        {/* Bank Details */}
        <FormSection title="Bank Details (for salary credit)" columns={2}>
          <FormField label="Bank Name">
            <Input
              value={currentBankName}
              onChange={(e) => setLocalBankName(e.target.value)}
              placeholder="HDFC Bank"
            />
          </FormField>
          <FormField label="Account Number">
            <Input
              value={currentBankAccountNumber}
              onChange={(e) => setLocalBankAccountNumber(e.target.value)}
              placeholder="50100123456789"
            />
          </FormField>
          <FormField label="IFSC Code">
            <Input
              value={currentBankIfsc}
              onChange={(e) => setLocalBankIfsc(e.target.value.toUpperCase())}
              placeholder="HDFC0001234"
              maxLength={11}
              className="uppercase"
            />
          </FormField>
        </FormSection>

        {/* Cross-module tabs */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex border-b bg-muted/30">
            {[
              { key: 'documents', label: 'Documents' },
              { key: 'education', label: 'Education' },
              { key: 'experience', label: 'Experience' },
              { key: 'family', label: 'Family' },
              { key: 'skills', label: 'Skills' },
              { key: 'leave', label: 'Leave Applications' },
              { key: 'attendance', label: 'Attendance' },
              { key: 'payroll', label: 'Payroll' },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div>
            {activeTab === 'documents' && <DocumentsTab employeeId={employeeId} />}
            {activeTab === 'education' && <EducationTab employeeId={employeeId} />}
            {activeTab === 'experience' && <ExperienceTab employeeId={employeeId} />}
            {activeTab === 'family' && <FamilyTab employeeId={employeeId} />}
            {activeTab === 'skills' && <SkillsTab employeeId={employeeId} />}
            {activeTab === 'leave' && <LeaveTab employeeId={employeeId} />}
            {activeTab === 'attendance' && <AttendanceTab employeeId={employeeId} />}
            {activeTab === 'payroll' && <PayrollTab employeeId={employeeId} />}
          </div>
        </div>
      </div>
    </FormPage>
  );
}
