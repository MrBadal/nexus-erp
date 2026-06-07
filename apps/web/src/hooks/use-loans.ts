'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoanType = 'loan' | 'advance';
export type LoanStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'closed'
  | 'cancelled';

export interface Loan {
  id: string;
  tenantId: string;
  loanNumber: string;
  employeeId: string;
  employeeName?: string | null;
  type: LoanType;
  principalAmount: string;
  interestRate: string;
  installments: number;
  installmentsPaid: number;
  emiAmount: string;
  outstandingAmount: string;
  status: LoanStatus;
  disbursedDate?: string | null;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanRepayment {
  id: string;
  tenantId: string;
  loanId: string;
  amount: string;
  paidDate: string;
  payrollEntryId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface LoanDetail extends Loan {
  approvedBy?: string | null;
  approvedAt?: string | null;
  repayments: LoanRepayment[];
}

export interface CreateLoanPayload {
  employeeId: string;
  type: LoanType;
  principalAmount: string;
  interestRate?: string;
  installments: number;
  emiAmount?: string;
  reason?: string;
}

export interface UpdateLoanPayload {
  type?: LoanType;
  principalAmount?: string;
  interestRate?: string;
  installments?: number;
  emiAmount?: string;
  reason?: string;
}

export interface RecordRepaymentPayload {
  amount: string;
  paidDate: string;
  note?: string;
}

export interface ApplyLoanPayload {
  type: LoanType;
  principalAmount: string;
  interestRate?: string;
  installments: number;
  reason?: string;
}

export interface LoanFilters {
  status?: string;
  employeeId?: string;
  type?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  list: (filters: LoanFilters) => [...loanKeys.lists(), filters] as const,
  detail: (id: string) => [...loanKeys.all, 'detail', id] as const,
  mine: () => [...loanKeys.all, 'mine'] as const,
};

function buildQuery(filters: LoanFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  if (filters.type) params.set('type', filters.type);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// HR hooks (/hr/loans)
// ---------------------------------------------------------------------------

export function useLoans(filters: LoanFilters = {}) {
  return useQuery({
    queryKey: loanKeys.list(filters),
    queryFn: () => get<Loan[]>(`/hr/loans${buildQuery(filters)}`),
  });
}

export function useLoan(id: string | undefined) {
  return useQuery({
    queryKey: loanKeys.detail(id ?? ''),
    queryFn: () => get<LoanDetail>(`/hr/loans/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLoanPayload) => post<LoanDetail>('/hr/loans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLoanPayload }) =>
      put<LoanDetail>(`/hr/loans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
}

export function useApproveLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<LoanDetail>(`/hr/loans/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
}

export function useRejectLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<LoanDetail>(`/hr/loans/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
}

export function useRecordRepayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecordRepaymentPayload }) =>
      post<LoanDetail>(`/hr/loans/${id}/repayment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del<void>(`/hr/loans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// ESS hooks (/ess/loans)
// ---------------------------------------------------------------------------

export function useMyLoans() {
  return useQuery({
    queryKey: loanKeys.mine(),
    queryFn: () => get<Loan[]>('/ess/loans'),
  });
}

export function useApplyLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyLoanPayload) => post<LoanDetail>('/ess/loans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.mine() });
    },
  });
}
