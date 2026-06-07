'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints, buildQueryString } from '@/lib/api';
import { createCrudHooks, createStatusActionHook, type ListParams } from './create-crud-hooks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Employee {
  id: string;
  tenantId: string;
  employeeId: string;
  /** Computed display name (firstName + lastName) — populated by some list endpoints. Use `${firstName} ${lastName}` for forms. */
  name?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | null;
  nationalId: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  department?: string;
  departmentId: string | null;
  designation?: string;
  designationId: string | null;
  managerId: string | null;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  dateOfJoining: string;
  dateOfLeaving: string | null;
  status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  // Indian statutory identifiers
  panNumber: string | null;
  aadhaarNumber: string | null;
  uanNumber: string | null;
  esicNumber: string | null;
  taxRegime: 'old' | 'new' | null;
  pfState: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Designation {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  manager: string;
  managerId: string;
  headcount: number;
  parentId: string | null;
  subDepartments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  empId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  workingHours: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApplication {
  id: string;
  tenantId: string;
  employeeId: string;
  employee: string;
  empId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface LeaveType {
  id: string;
  tenantId?: string;
  name: string;
  /** Short uppercase code like 'CL' (Casual), 'SL' (Sick), 'EL' (Earned). */
  code?: string;
  /** @deprecated kept for back-compat; use `defaultDays` from API. */
  maxDays?: number;
  defaultDays: number;
  isPaid: boolean;
  isCarryForward?: boolean;
  maxCarryForwardDays?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollEntryComponent {
  id: string;
  componentId: string;
  componentName: string;
  componentCode: string;
  amount: string;
  type: 'earning' | 'deduction';
}

export interface PayrollEntry {
  id: string;
  tenantId: string;
  employeeId?: string;
  period: string;
  employees?: number;
  salaryStructureId?: string;
  grossPay: number;
  totalDeductions?: number;
  deductions?: number;
  netPay: number;
  employerEpf?: number;
  employerEsic?: number;
  workingDays?: number;
  presentDays?: number;
  lopDays?: number;
  status: 'pending' | 'processing' | 'approved' | 'paid' | 'draft' | 'submitted';
  paidDate?: string;
  paymentMethod?: string;
  journalEntryId?: string;
  components?: PayrollEntryComponent[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Employees – full CRUD via factory
// ---------------------------------------------------------------------------

const employeeCrud = createCrudHooks<Employee>('employees', {
  list: endpoints.employees.list,
  get: endpoints.employees.get,
  create: endpoints.employees.create,
  update: endpoints.employees.update,
  delete: endpoints.employees.delete,
});

export const useEmployees = employeeCrud.useList;
export const useEmployee = employeeCrud.useById;
export const useCreateEmployee = employeeCrud.useCreate;
export const useUpdateEmployee = employeeCrud.useUpdate;
export const useDeleteEmployee = employeeCrud.useDelete;
export const employeeKeys = employeeCrud.queryKeys;

// ---------------------------------------------------------------------------
// Departments – full CRUD via factory
// ---------------------------------------------------------------------------

const departmentCrud = createCrudHooks<Department>('departments', {
  list: endpoints.departments.list,
  get: endpoints.departments.get,
  create: endpoints.departments.create,
  update: endpoints.departments.update,
  delete: endpoints.departments.delete,
});

export const useDepartments = departmentCrud.useList;
export const useDepartment = departmentCrud.useById;
export const useCreateDepartment = departmentCrud.useCreate;
export const useUpdateDepartment = departmentCrud.useUpdate;
export const useDeleteDepartment = departmentCrud.useDelete;
export const departmentKeys = departmentCrud.queryKeys;

// ---------------------------------------------------------------------------
// Designations – full CRUD via factory
// ---------------------------------------------------------------------------

const designationCrud = createCrudHooks<Designation>('designations', {
  list: endpoints.designations.list,
  get: endpoints.designations.get,
  create: endpoints.designations.create,
  update: endpoints.designations.update,
  delete: endpoints.designations.delete,
});

export const useDesignations = designationCrud.useList;
export const useDesignation = designationCrud.useById;
export const useCreateDesignation = designationCrud.useCreate;
export const useUpdateDesignation = designationCrud.useUpdate;
export const useDeleteDesignation = designationCrud.useDelete;
export const designationKeys = designationCrud.queryKeys;

// ---------------------------------------------------------------------------
// Attendance – list + check-in / check-out
// ---------------------------------------------------------------------------

export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...attendanceKeys.lists(), params] as const,
};

export function useAttendance(params?: ListParams) {
  return useQuery({
    queryKey: attendanceKeys.list(params),
    queryFn: async () => {
      const qs = params ? buildQueryString(params as Record<string, string | number | boolean | undefined | null>) : '';
      return get<AttendanceRecord[]>(`${endpoints.attendance.list}${qs}`);
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { employeeId?: string }) => {
      return post<AttendanceRecord>(endpoints.attendance.checkIn, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { employeeId?: string }) => {
      return post<AttendanceRecord>(endpoints.attendance.checkOut, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return post<AttendanceRecord>(endpoints.attendance.manual, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return put<AttendanceRecord>(endpoints.attendance.update(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.attendance.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Leave Applications
// ---------------------------------------------------------------------------

export const leaveKeys = {
  all: ['leaveApplications'] as const,
  lists: () => [...leaveKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...leaveKeys.lists(), params] as const,
  details: () => [...leaveKeys.all, 'detail'] as const,
  detail: (id: string) => [...leaveKeys.details(), id] as const,
};

export function useLeaveApplications(params?: ListParams) {
  return useQuery({
    queryKey: leaveKeys.list(params),
    queryFn: async () => {
      const qs = params ? buildQueryString(params as Record<string, string | number | boolean | undefined | null>) : '';
      return get<LeaveApplication[]>(`${endpoints.leaveApplications.list}${qs}`);
    },
  });
}

export function useLeaveApplication(id: string) {
  return useQuery({
    queryKey: leaveKeys.detail(id),
    queryFn: async () => {
      return get<LeaveApplication>(endpoints.leaveApplications.get(id));
    },
    enabled: !!id,
  });
}

export function useUpdateLeaveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeaveApplication> | Record<string, unknown> }) => {
      return put<LeaveApplication>(endpoints.leaveApplications.update(id), data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leaveKeys.lists() });
    },
  });
}

export function useDeleteLeaveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.leaveApplications.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

export function useCreateLeaveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<LeaveApplication> | Record<string, unknown>) => {
      return post<LeaveApplication>(endpoints.leaveApplications.create, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

export const useApproveLeave = createStatusActionHook<LeaveApplication>(
  'leaveApplications',
  'approve',
  endpoints.leaveApplications.approve,
);

export const useRejectLeave = createStatusActionHook<LeaveApplication>(
  'leaveApplications',
  'reject',
  endpoints.leaveApplications.reject,
);

export const useCancelLeave = createStatusActionHook<LeaveApplication>(
  'leaveApplications',
  'cancel',
  endpoints.leaveApplications.cancel,
);

// ---------------------------------------------------------------------------
// Leave Types (list only)
// ---------------------------------------------------------------------------

export const leaveTypeKeys = {
  all: ['leaveTypes'] as const,
  lists: () => [...leaveTypeKeys.all, 'list'] as const,
};

export function useLeaveTypes() {
  return useQuery({
    queryKey: leaveTypeKeys.lists(),
    queryFn: async () => {
      return get<LeaveType[]>(endpoints.leaveTypes.list);
    },
  });
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

export const payrollKeys = {
  all: ['payroll'] as const,
  lists: () => [...payrollKeys.all, 'list'] as const,
  list: (params?: ListParams) => [...payrollKeys.lists(), params] as const,
  details: () => [...payrollKeys.all, 'detail'] as const,
  detail: (id: string) => [...payrollKeys.details(), id] as const,
};

export function usePayrollEntries(params?: ListParams) {
  return useQuery({
    queryKey: payrollKeys.list(params),
    queryFn: async () => {
      const qs = params ? buildQueryString(params as Record<string, string | number | boolean | undefined | null>) : '';
      return get<PayrollEntry[]>(`${endpoints.payroll.list}${qs}`);
    },
  });
}

export function usePayrollEntry(id: string) {
  return useQuery({
    queryKey: payrollKeys.detail(id),
    queryFn: async () => {
      return get<PayrollEntry>(endpoints.payroll.get(id));
    },
    enabled: !!id,
  });
}

export function useUpdatePayrollEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PayrollEntry> | Record<string, unknown> }) => {
      return put<PayrollEntry>(endpoints.payroll.update(id), data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
    },
  });
}

export function useDeletePayrollEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await del(endpoints.payroll.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return post<PayrollEntry>(endpoints.payroll.generate, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export const useApprovePayroll = createStatusActionHook<PayrollEntry>(
  'payroll',
  'approve',
  endpoints.payroll.approve,
);

export const usePayPayroll = createStatusActionHook<PayrollEntry>(
  'payroll',
  'pay',
  endpoints.payroll.pay,
);

export const useVoidPayroll = createStatusActionHook<PayrollEntry>(
  'payroll',
  'void',
  endpoints.payroll.void,
);

// ── Expense Claims ──────────────────────────────────────

export interface ExpenseClaim {
  id: string;
  tenantId: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string | null;
  claimDate: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  totalAmount: string;
  approvedAmount: string;
  purpose: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: ExpenseClaimLine[];
}

export interface ExpenseClaimLine {
  id: string;
  expenseDate: string;
  category: string;
  description: string | null;
  amount: string;
}

const ecEndpoints = {
  list: endpoints.expenseClaims.list,
  get: endpoints.expenseClaims.get,
  create: endpoints.expenseClaims.create,
  update: endpoints.expenseClaims.update,
  delete: endpoints.expenseClaims.delete,
};

const ecHooks = createCrudHooks<ExpenseClaim>('expenseClaims', ecEndpoints);

export const useExpenseClaims = ecHooks.useList;
export const useExpenseClaim = ecHooks.useById;
export const useCreateExpenseClaim = ecHooks.useCreate;
export const useUpdateExpenseClaim = ecHooks.useUpdate;
export const useDeleteExpenseClaim = ecHooks.useDelete;
export const expenseClaimKeys = ecHooks.queryKeys;

export const useSubmitExpenseClaim = createStatusActionHook<ExpenseClaim>(
  'expenseClaims',
  'submit',
  endpoints.expenseClaims.submit,
);

export const useApproveExpenseClaim = createStatusActionHook<ExpenseClaim>(
  'expenseClaims',
  'approve',
  endpoints.expenseClaims.approve,
);

export const useRejectExpenseClaim = createStatusActionHook<ExpenseClaim>(
  'expenseClaims',
  'reject',
  endpoints.expenseClaims.reject,
);

export const usePayExpenseClaim = createStatusActionHook<ExpenseClaim>(
  'expenseClaims',
  'pay',
  endpoints.expenseClaims.pay,
);
