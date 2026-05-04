'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { get, post, endpoints } from '@/lib/api';

// ─── Shared types ────────────────────────────────────────

export interface EssEmployee {
  id: string;
  tenantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  departmentId: string | null;
  designationId: string | null;
  managerId: string | null;
  dateOfJoining: string;
  status: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  profileImageUrl: string | null;
  department?: string | null;
  designation?: string | null;
}

export interface EssAttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave';
  workingHours: string | null;
  notes: string | null;
}

export interface EssLeaveBalance {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  fiscalYear: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface EssLeaveApplication {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

export interface EssPayrollEntry {
  id: string;
  period: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  status: string;
  workingDays: number | null;
  presentDays: number | null;
  lopDays: number | null;
  paidDate: string | null;
}

export interface EssExpenseClaim {
  id: string;
  claimNumber: string;
  claimDate: string;
  totalAmount: string;
  approvedAmount: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  purpose: string | null;
}

export interface EssTeamMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  designation: string | null;
  profileImageUrl: string | null;
}

export interface EssTeam {
  manager: EssTeamMember | null;
  peers: EssTeamMember[];
  directReports: EssTeamMember[];
}

export interface EssDashboard {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
    profileImageUrl: string | null;
  };
  leaveBalances: Array<{
    leaveTypeName: string;
    leaveTypeCode: string;
    totalDays: number;
    usedDays: number;
    remainingDays: number;
  }>;
  todayAttendance: EssAttendanceRecord | null;
  latestPayslip: EssPayrollEntry | null;
  pendingExpenses: number;
  unreadAnnouncements: number;
}

export interface EssTeamCalendarEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  status: string;
  isMine: boolean;
}

// ─── Profile ─────────────────────────────────────────────

export function useEssProfile() {
  return useQuery<EssEmployee>({
    queryKey: ['ess', 'profile'],
    queryFn: () => get<EssEmployee>(endpoints.ess.profile),
  });
}

export interface UpdateProfilePayload {
  phone?: string;
  currentAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export function useUpdateEssProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('nexus_access_token')
          : null;
      const tenantStr =
        typeof window !== 'undefined'
          ? localStorage.getItem('nexus_tenant')
          : null;
      const tenantId = tenantStr ? (JSON.parse(tenantStr) as { id?: string }).id : undefined;

      const res = await axios.patch(`${baseURL}${endpoints.ess.profile}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
          ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
        },
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'profile'] });
      qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
    },
  });
}

// ─── Attendance ──────────────────────────────────────────

export function useEssAttendanceToday() {
  return useQuery<EssAttendanceRecord | null>({
    queryKey: ['ess', 'attendance', 'today'],
    queryFn: () => get<EssAttendanceRecord | null>(endpoints.ess.attendance.today),
  });
}

export function useEssAttendanceHistory(from?: string, to?: string) {
  return useQuery<EssAttendanceRecord[]>({
    queryKey: ['ess', 'attendance', 'me', from, to],
    queryFn: () =>
      get<EssAttendanceRecord[]>(endpoints.ess.attendance.me, { from, to }),
  });
}

export function useEssCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { notes?: string } = {}) =>
      post<EssAttendanceRecord>(endpoints.ess.attendance.checkIn, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'attendance'] });
      qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
    },
  });
}

export function useEssCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { notes?: string } = {}) =>
      post<EssAttendanceRecord>(endpoints.ess.attendance.checkOut, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'attendance'] });
      qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
    },
  });
}

// ─── Leave ───────────────────────────────────────────────

export function useEssLeaveBalance() {
  return useQuery<EssLeaveBalance[]>({
    queryKey: ['ess', 'leave', 'balance'],
    queryFn: () => get<EssLeaveBalance[]>(endpoints.ess.leave.balance),
  });
}

export function useEssLeaveApplications(status?: string) {
  return useQuery<EssLeaveApplication[]>({
    queryKey: ['ess', 'leave', 'applications', status],
    queryFn: () =>
      get<EssLeaveApplication[]>(endpoints.ess.leave.applications, { status }),
  });
}

export interface ApplyLeavePayload {
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason?: string;
}

export function useApplyEssLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyLeavePayload) =>
      post<EssLeaveApplication>(endpoints.ess.leave.applications, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'leave'] });
      qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
    },
  });
}

export function useWithdrawEssLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post<EssLeaveApplication>(endpoints.ess.leave.withdraw(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'leave'] });
    },
  });
}

export function useEssTeamCalendar(month: string) {
  return useQuery<EssTeamCalendarEntry[]>({
    queryKey: ['ess', 'leave', 'team-calendar', month],
    queryFn: () =>
      get<EssTeamCalendarEntry[]>(endpoints.ess.leave.teamCalendar, { month }),
    enabled: !!month,
  });
}

// ─── Payroll ─────────────────────────────────────────────

export function useEssPayrollEntries() {
  return useQuery<EssPayrollEntry[]>({
    queryKey: ['ess', 'payroll', 'entries'],
    queryFn: () => get<EssPayrollEntry[]>(endpoints.ess.payroll.entries),
  });
}

/** Download payslip PDF and trigger browser save. */
export async function downloadEssPayslipPdf(payrollEntryId: string, period?: string) {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('nexus_access_token') : null;
  const tenantStr =
    typeof window !== 'undefined' ? localStorage.getItem('nexus_tenant') : null;
  const tenantId = tenantStr ? (JSON.parse(tenantStr) as { id?: string }).id : undefined;

  const res = await fetch(`${baseURL}${endpoints.ess.payroll.pdf(payrollEntryId)}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download payslip (${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${period ?? payrollEntryId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Expenses ────────────────────────────────────────────

export function useEssExpenses() {
  return useQuery<EssExpenseClaim[]>({
    queryKey: ['ess', 'expenses'],
    queryFn: () => get<EssExpenseClaim[]>(endpoints.ess.expenses),
  });
}

export interface SubmitExpensePayload {
  claimDate: string;
  purpose?: string;
  notes?: string;
  lines: Array<{
    expenseDate: string;
    category: string;
    description?: string;
    amount: string;
  }>;
}

export function useSubmitEssExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitExpensePayload) =>
      post<EssExpenseClaim>(endpoints.ess.expenses, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess', 'expenses'] });
      qc.invalidateQueries({ queryKey: ['ess', 'dashboard'] });
    },
  });
}

// ─── Team ────────────────────────────────────────────────

export function useEssTeam() {
  return useQuery<EssTeam>({
    queryKey: ['ess', 'team'],
    queryFn: () => get<EssTeam>(endpoints.ess.team),
  });
}

// ─── Dashboard ───────────────────────────────────────────

export function useEssDashboard() {
  return useQuery<EssDashboard>({
    queryKey: ['ess', 'dashboard'],
    queryFn: () => get<EssDashboard>(endpoints.ess.dashboard),
  });
}
