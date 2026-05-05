'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  useCreateEmployee,
  useDepartments,
  useDesignations,
  useEmployees,
} from '@/hooks/use-hr';

// ─── Indian validators (mirrors backend DTO) ───
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[2-9][0-9]{11}$/;
const UAN_REGEX = /^[0-9]{12}$/;
const ESIC_REGEX = /^[0-9]{10,17}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const PHONE_REGEX = /^(\+91|91|0)?[6-9][0-9]{9}$/;

// ─── Indian states + UTs (matches packages/utils/src/validation.ts) ───
const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  // Address
  address: string;
  city: string;
  state: string;
  postalCode: string;
  // Employment
  departmentId: string;
  designationId: string;
  managerId: string;
  employmentType: string;
  dateOfJoining: string;
  // Emergency contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  // Bank
  bankName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  // Indian statutory
  panNumber: string;
  aadhaarNumber: string;
  uanNumber: string;
  esicNumber: string;
  taxRegime: string;
}

const initialFormData: FormData = {
  firstName: '', lastName: '', email: '', phone: '',
  dateOfBirth: '', gender: '', maritalStatus: '',
  address: '', city: '', state: '', postalCode: '',
  departmentId: '', designationId: '', managerId: '',
  employmentType: 'full_time', dateOfJoining: '',
  emergencyContactName: '', emergencyContactPhone: '',
  bankName: '', bankAccountNumber: '', bankIfscCode: '',
  panNumber: '', aadhaarNumber: '', uanNumber: '', esicNumber: '',
  taxRegime: 'new',
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const createEmployee = useCreateEmployee();
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: employees } = useEmployees();

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!form.dateOfJoining) e.dateOfJoining = 'Date of joining is required';
    if (!form.employmentType) e.employmentType = 'Employment type is required';

    // Indian-format checks (only when filled)
    if (form.phone && !PHONE_REGEX.test(form.phone.replace(/[\s-]/g, ''))) {
      e.phone = '10-digit Indian mobile (6/7/8/9 prefix), with optional +91';
    }
    if (form.emergencyContactPhone && !PHONE_REGEX.test(form.emergencyContactPhone.replace(/[\s-]/g, ''))) {
      e.emergencyContactPhone = '10-digit Indian mobile (6/7/8/9 prefix)';
    }
    if (form.postalCode && !PINCODE_REGEX.test(form.postalCode)) {
      e.postalCode = 'Pincode must be 6 digits, cannot start with 0';
    }
    if (form.panNumber && !PAN_REGEX.test(form.panNumber.toUpperCase())) {
      e.panNumber = 'PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)';
    }
    if (form.aadhaarNumber && !AADHAAR_REGEX.test(form.aadhaarNumber.replace(/[\s-]/g, ''))) {
      e.aadhaarNumber = 'Aadhaar must be 12 digits, cannot start with 0/1';
    }
    if (form.uanNumber && !UAN_REGEX.test(form.uanNumber)) {
      e.uanNumber = 'UAN must be exactly 12 digits';
    }
    if (form.esicNumber && !ESIC_REGEX.test(form.esicNumber)) {
      e.esicNumber = 'ESIC must be 10-17 digits';
    }
    if (form.bankIfscCode && !IFSC_REGEX.test(form.bankIfscCode.toUpperCase())) {
      e.bankIfscCode = 'IFSC format: 4 letters + 0 + 6 alphanumeric (e.g. HDFC0001234)';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }

    // Build payload — ONLY fields the backend DTO accepts.
    // Empty strings → undefined so optional checks pass.
    const opt = (v: string) => (v.trim() === '' ? undefined : v.trim());
    const payload: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      employmentType: form.employmentType,
      dateOfJoining: form.dateOfJoining,
      phone: opt(form.phone),
      dateOfBirth: opt(form.dateOfBirth),
      gender: opt(form.gender),
      maritalStatus: opt(form.maritalStatus),
      address: opt(form.address),
      city: opt(form.city),
      state: opt(form.state),
      country: 'India',
      postalCode: opt(form.postalCode),
      departmentId: opt(form.departmentId),
      designationId: opt(form.designationId),
      managerId: opt(form.managerId),
      emergencyContactName: opt(form.emergencyContactName),
      emergencyContactPhone: opt(form.emergencyContactPhone),
      bankName: opt(form.bankName),
      bankAccountNumber: opt(form.bankAccountNumber),
      bankIfscCode: opt(form.bankIfscCode)?.toUpperCase(),
      panNumber: opt(form.panNumber)?.toUpperCase(),
      aadhaarNumber: opt(form.aadhaarNumber)?.replace(/[\s-]/g, ''),
      uanNumber: opt(form.uanNumber),
      esicNumber: opt(form.esicNumber),
      taxRegime: form.taxRegime,
      pfState: opt(form.state),
    };
    // Strip undefined keys so server-side `whitelist` validator stays clean.
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    createEmployee.mutate(payload as never, {
      onSuccess: () => {
        toast.success('Employee created successfully');
        router.push('/hr/employees');
      },
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to create employee');
      },
    });
  };

  return (
    <FormPage
      title="New Employee"
      subtitle="Add a new employee — Indian statutory fields included"
      backHref="/hr/employees"
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Employees', href: '/hr/employees' },
        { label: 'New Employee' },
      ]}
      primaryAction={{
        label: 'Create Employee',
        onClick: handleSubmit,
        loading: createEmployee.isPending,
        disabled: createEmployee.isPending,
      }}
      secondaryActions={[
        { label: 'Cancel', onClick: () => router.push('/hr/employees'), variant: 'outline' },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Personal Information" columns={2}>
          <FormField label="First Name" required error={errors.firstName}>
            <Input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="Riya" />
          </FormField>
          <FormField label="Last Name" required error={errors.lastName}>
            <Input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="Sharma" />
          </FormField>
          <FormField label="Email" required error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="riya.sharma@company.in" />
          </FormField>
          <FormField label="Mobile (Indian)" error={errors.phone}>
            <Input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 9876543210" />
          </FormField>
          <FormField label="Date of Birth">
            <Input type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} />
          </FormField>
          <FormField label="Gender">
            <Select value={form.gender} onValueChange={(v) => update('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Marital Status">
            <Select value={form.maritalStatus} onValueChange={(v) => update('maritalStatus', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Address" columns={2}>
          <FormField label="Address" className="md:col-span-2">
            <Textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} placeholder="Door / Flat / Street" />
          </FormField>
          <FormField label="City">
            <Input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Bengaluru" />
          </FormField>
          <FormField label="State">
            <Select value={form.state} onValueChange={(v) => update('state', v)}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {INDIAN_STATES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Pincode" error={errors.postalCode}>
            <Input value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} placeholder="560001" maxLength={6} />
          </FormField>
        </FormSection>

        <FormSection title="Employment" columns={2}>
          <FormField label="Department">
            <Select value={form.departmentId} onValueChange={(v) => update('departmentId', v)}>
              <SelectTrigger><SelectValue placeholder={departments?.length ? 'Select department' : 'No departments yet'} /></SelectTrigger>
              <SelectContent>
                {departments?.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Designation">
            <Select value={form.designationId} onValueChange={(v) => update('designationId', v)}>
              <SelectTrigger><SelectValue placeholder={designations?.length ? 'Select designation' : 'No designations yet'} /></SelectTrigger>
              <SelectContent>
                {designations?.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Reports To (Manager)">
            <Select value={form.managerId} onValueChange={(v) => update('managerId', v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {employees?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.employeeId})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Employment Type" required error={errors.employmentType}>
            <Select value={form.employmentType} onValueChange={(v) => update('employmentType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Date of Joining" required error={errors.dateOfJoining}>
            <Input type="date" value={form.dateOfJoining} onChange={(e) => update('dateOfJoining', e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Indian Statutory Identifiers" columns={2}>
          <FormField label="PAN" error={errors.panNumber}>
            <Input value={form.panNumber} onChange={(e) => update('panNumber', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} className="uppercase" />
          </FormField>
          <FormField label="Aadhaar" error={errors.aadhaarNumber}>
            <Input value={form.aadhaarNumber} onChange={(e) => update('aadhaarNumber', e.target.value)} placeholder="1234 5678 9012" maxLength={14} />
          </FormField>
          <FormField label="UAN (EPFO)" error={errors.uanNumber}>
            <Input value={form.uanNumber} onChange={(e) => update('uanNumber', e.target.value)} placeholder="100123456789" maxLength={12} />
          </FormField>
          <FormField label="ESIC Number" error={errors.esicNumber}>
            <Input value={form.esicNumber} onChange={(e) => update('esicNumber', e.target.value)} placeholder="3300123456789012" maxLength={17} />
          </FormField>
          <FormField label="Tax Regime">
            <Select value={form.taxRegime} onValueChange={(v) => update('taxRegime', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Regime (default)</SelectItem>
                <SelectItem value="old">Old Regime</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Bank Details (for salary credit)" columns={2}>
          <FormField label="Bank Name">
            <Input value={form.bankName} onChange={(e) => update('bankName', e.target.value)} placeholder="HDFC Bank" />
          </FormField>
          <FormField label="Account Number">
            <Input value={form.bankAccountNumber} onChange={(e) => update('bankAccountNumber', e.target.value)} placeholder="50100123456789" />
          </FormField>
          <FormField label="IFSC Code" error={errors.bankIfscCode}>
            <Input value={form.bankIfscCode} onChange={(e) => update('bankIfscCode', e.target.value.toUpperCase())} placeholder="HDFC0001234" maxLength={11} className="uppercase" />
          </FormField>
        </FormSection>

        <FormSection title="Emergency Contact" columns={2}>
          <FormField label="Contact Name">
            <Input value={form.emergencyContactName} onChange={(e) => update('emergencyContactName', e.target.value)} placeholder="Spouse / parent / sibling name" />
          </FormField>
          <FormField label="Contact Phone" error={errors.emergencyContactPhone}>
            <Input type="tel" value={form.emergencyContactPhone} onChange={(e) => update('emergencyContactPhone', e.target.value)} placeholder="+91 9876543210" />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
