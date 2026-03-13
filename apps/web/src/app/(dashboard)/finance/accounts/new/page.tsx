'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccounts, useCreateAccount } from '@/hooks/use-accounts';

// --------------------------------------------------------------------------
// Schema
// --------------------------------------------------------------------------

const accountSchema = z.object({
  code: z
    .string()
    .min(1, 'Account code is required')
    .max(20, 'Code must be 20 characters or less'),
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(255, 'Name must be 255 characters or less'),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense'], {
    required_error: 'Account type is required',
  }),
  parentId: z.string().optional(),
  currencyCode: z.string().min(1, 'Currency is required'),
  description: z.string().optional(),
  isHeader: z.boolean(),
});

type AccountFormData = z.infer<typeof accountSchema>;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY'] as const;

function normalBalanceFor(type: string): string {
  if (type === 'asset' || type === 'expense') return 'Debit';
  return 'Credit';
}

function financialStatementFor(type: string): string {
  if (type === 'revenue' || type === 'expense') return 'Income Statement';
  return 'Balance Sheet';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function NewAccountPage() {
  const router = useRouter();
  const createMutation = useCreateAccount();
  const { data: allAccounts } = useAccounts();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: '',
      name: '',
      accountType: undefined,
      parentId: '',
      currencyCode: 'USD',
      description: '',
      isHeader: false,
    },
  });

  const watchedType = watch('accountType');

  // Parent options: only header accounts
  const parentOptions = useMemo(() => {
    if (!allAccounts) return [];
    return allAccounts
      .filter((a) => a.isHeader)
      .map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }));
  }, [allAccounts]);

  function onSubmit(data: AccountFormData) {
    const normalBalance = data.accountType === 'asset' || data.accountType === 'expense' ? 'debit' : 'credit';
    const financialStatement =
      data.accountType === 'revenue' || data.accountType === 'expense'
        ? 'income_statement'
        : 'balance_sheet';

    createMutation.mutate(
      {
        code: data.code,
        name: data.name,
        accountType: data.accountType,
        normalBalance,
        financialStatement,
        parentId: data.parentId || null,
        currencyCode: data.currencyCode,
        description: data.description || null,
        isHeader: data.isHeader,
      },
      {
        onSuccess: (account) => {
          router.push(`/finance/accounts/${account.id}`);
        },
      },
    );
  }

  return (
    <FormPage
      title="New Account"
      subtitle="Create a new account in the Chart of Accounts"
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Chart of Accounts', href: '/finance/accounts' },
        { label: 'New Account' },
      ]}
      backHref="/finance/accounts"
      primaryAction={{
        label: 'Save Account',
        onClick: handleSubmit(onSubmit),
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        {
          label: 'Cancel',
          onClick: () => router.push('/finance/accounts'),
          variant: 'outline',
        },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Account Details" columns={2}>
          {/* Code */}
          <FormField label="Code" required error={errors.code?.message}>
            <Input
              {...register('code')}
              placeholder="e.g. 1000"
              className="font-mono"
              maxLength={20}
            />
          </FormField>

          {/* Name */}
          <FormField label="Name" required error={errors.name?.message}>
            <Input
              {...register('name')}
              placeholder="e.g. Cash and Cash Equivalents"
              maxLength={255}
            />
          </FormField>

          {/* Account Type */}
          <FormField label="Account Type" required error={errors.accountType?.message}>
            <Controller
              control={control}
              name="accountType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {capitalize(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Normal Balance (computed, read-only) */}
          <FormField label="Normal Balance" description="Auto-calculated from account type">
            <Input
              value={watchedType ? normalBalanceFor(watchedType) : ''}
              readOnly
              disabled
              className="bg-muted"
            />
          </FormField>

          {/* Financial Statement (computed, read-only) */}
          <FormField label="Financial Statement" description="Auto-calculated from account type">
            <Input
              value={watchedType ? financialStatementFor(watchedType) : ''}
              readOnly
              disabled
              className="bg-muted"
            />
          </FormField>

          {/* Parent Account */}
          <FormField label="Parent Account" description="Optional. Must be a header account.">
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (top-level)</SelectItem>
                    {parentOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Currency */}
          <FormField label="Currency" required error={errors.currencyCode?.message}>
            <Controller
              control={control}
              name="currencyCode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <Textarea
              {...register('description')}
              placeholder="Optional description for this account"
              rows={3}
            />
          </FormField>

          {/* Is Header */}
          <FormField label="Header Account" description="Header accounts group sub-accounts and cannot hold transactions directly.">
            <Controller
              control={control}
              name="isHeader"
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(!!checked)}
                    id="isHeader"
                  />
                  <label htmlFor="isHeader" className="text-sm cursor-pointer">
                    This is a header / group account
                  </label>
                </div>
              )}
            />
          </FormField>
        </FormSection>
      </form>
    </FormPage>
  );
}
