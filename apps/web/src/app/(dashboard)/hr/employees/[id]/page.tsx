'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import {
  useEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useDepartments,
  useLeaveApplications,
  useAttendance,
  usePayrollEntries,
  type Employee,
} from '@/hooks/use-hr';
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
  const [localDesignation, setLocalDesignation] = useState<string | null>(null);
  const [localEmploymentType, setLocalEmploymentType] = useState<string | null>(null);
  const [localDateOfJoining, setLocalDateOfJoining] = useState<string | null>(null);
  const [localDateOfLeaving, setLocalDateOfLeaving] = useState<string | null>(null);
  const [localSalary, setLocalSalary] = useState<string | null>(null);
  const [localCurrency, setLocalCurrency] = useState<string | null>(null);
  const [localBankAccount, setLocalBankAccount] = useState<string | null>(null);
  const [localTaxId, setLocalTaxId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('leave');

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
  const currentDesignation = localDesignation ?? employee?.designation ?? '';
  const currentEmploymentType = localEmploymentType ?? employee?.employmentType ?? 'full_time';
  const currentDateOfJoining = localDateOfJoining ?? employee?.dateOfJoining ?? '';
  const currentDateOfLeaving = localDateOfLeaving ?? '';
  const currentSalary = localSalary ?? '';
  const currentCurrency = localCurrency ?? 'INR';
  const currentBankAccount = localBankAccount ?? '';
  const currentTaxId = localTaxId ?? '';

  function handleSave() {
    if (!employee) return;
    updateMutation.mutate(
      {
        id: employeeId,
        data: {
          firstName: currentFirstName,
          lastName: currentLastName,
          email: currentEmail,
          phone: currentPhone,
          gender: currentGender,
          dateOfBirth: currentDateOfBirth,
          nationalId: currentNationalId,
          address: currentAddress,
          departmentId: currentDepartmentId,
          designation: currentDesignation,
          employmentType: currentEmploymentType,
          dateOfJoining: currentDateOfJoining,
        },
      },
      {
        onSuccess: () => toast.success('Employee saved'),
        onError: () => toast.error('Failed to save employee'),
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

  const secondaryActions = [];
  if (status === 'inactive') {
    secondaryActions.push({ label: 'Activate', onClick: handleActivate, variant: 'outline' as const });
  }
  if (status === 'active' || status === 'on_leave') {
    secondaryActions.push({ label: 'Terminate', onClick: handleTerminate, variant: 'outline' as const });
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
            <Input value={currentDesignation} onChange={(e) => setLocalDesignation(e.target.value)} placeholder="Job title / designation" />
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

        {/* Compensation */}
        <FormSection title="Compensation" columns={2}>
          <FormField label="Salary">
            <Input value={currentSalary} onChange={(e) => setLocalSalary(e.target.value)} placeholder="0.00" type="number" min="0" />
          </FormField>
          <FormField label="Currency">
            <Input value={currentCurrency} onChange={(e) => setLocalCurrency(e.target.value)} placeholder="INR" />
          </FormField>
          <FormField label="Bank Account">
            <Input value={currentBankAccount} onChange={(e) => setLocalBankAccount(e.target.value)} placeholder="Bank account number" />
          </FormField>
          <FormField label="Tax ID">
            <Input value={currentTaxId} onChange={(e) => setLocalTaxId(e.target.value)} placeholder="Tax identification number" />
          </FormField>
        </FormSection>

        {/* Cross-module tabs */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex border-b bg-muted/30">
            {[
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
            {activeTab === 'leave' && <LeaveTab employeeId={employeeId} />}
            {activeTab === 'attendance' && <AttendanceTab employeeId={employeeId} />}
            {activeTab === 'payroll' && <PayrollTab employeeId={employeeId} />}
          </div>
        </div>
      </div>
    </FormPage>
  );
}
