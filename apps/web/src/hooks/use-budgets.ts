'use client';

import { endpoints } from '@/lib/api';
import { createCrudHooks, createStatusActionHook, type CrudEndpoints } from './create-crud-hooks';

export interface BudgetLine {
  id: string;
  accountId: string;
  budgetedAmount: string;
  actualAmount: string;
  month: number | null;
  notes: string | null;
  accountCode: string | null;
  accountName: string | null;
}

export interface Budget {
  id: string;
  tenantId: string;
  name: string;
  fiscalYear: string;
  fromDate: string;
  toDate: string;
  status: 'draft' | 'active' | 'closed';
  totalBudgeted: string;
  totalActual: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: BudgetLine[];
}

const budgetEndpoints: CrudEndpoints = {
  list: endpoints.budgets.list,
  get: endpoints.budgets.get,
  create: endpoints.budgets.create,
  update: endpoints.budgets.update,
  delete: endpoints.budgets.delete,
};

const budgetHooks = createCrudHooks<Budget>('budgets', budgetEndpoints);

export const useBudgets = budgetHooks.useList;
export const useBudget = budgetHooks.useById;
export const useCreateBudget = budgetHooks.useCreate;
export const useUpdateBudget = budgetHooks.useUpdate;
export const useDeleteBudget = budgetHooks.useDelete;
export const budgetKeys = budgetHooks.queryKeys;

export const useActivateBudget = createStatusActionHook<Budget>(
  'budgets',
  'activate',
  endpoints.budgets.activate,
);

export const useCloseBudget = createStatusActionHook<Budget>(
  'budgets',
  'close',
  endpoints.budgets.close,
);

export const useRefreshBudgetActuals = createStatusActionHook<Budget>(
  'budgets',
  'refreshActuals',
  endpoints.budgets.refreshActuals,
);
