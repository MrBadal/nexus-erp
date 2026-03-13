'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, ExternalLink } from 'lucide-react';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAccount,
  useAccounts,
  useUpdateAccount,
  useDeleteAccount,
} from '@/hooks/use-accounts';
import { formatCurrency } from '@/lib/utils';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;

function normalBalanceFor(type: string): string {
  if (type === 'asset' || type === 'expense') return 'debit';
  return 'credit';
}

function financialStatementFor(type: string): string {
  if (type === 'revenue' || type === 'expense') return 'income_statement';
  return 'balance_sheet';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function labelFromSnake(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// --------------------------------------------------------------------------
// Loading skeleton
// --------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="border rounded-lg bg-card p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Page
// --------------------------------------------------------------------------

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const accountId = params.id;

  const { data: account, isLoading, error } = useAccount(accountId);
  const { data: allAccounts } = useAccounts();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  const [isEditing, setIsEditing] = useState(false);

  // Editable form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formCurrency, setFormCurrency] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Sync when account loads or edit is toggled
  React.useEffect(() => {
    if (account) {
      setFormCode(account.code);
      setFormName(account.name);
      setFormType(account.accountType);
      setFormParentId(account.parentId ?? '');
      setFormCurrency(account.currencyCode);
      setFormDescription(account.description ?? '');
    }
  }, [account]);

  // Parent account options (only headers)
  const parentOptions = useMemo(() => {
    if (!allAccounts) return [];
    return allAccounts
      .filter((a) => a.isHeader && a.id !== accountId)
      .map((a) => ({ value: a.id, label: `${a.code} - ${a.name}` }));
  }, [allAccounts, accountId]);

  // Computed values
  const normalBalance = normalBalanceFor(formType || account?.accountType || 'asset');
  const financialStatement = financialStatementFor(formType || account?.accountType || 'asset');

  // Balance calculations
  const openingBalance = parseFloat(account?.openingBalance ?? '0');
  const currentBalance = parseFloat(account?.currentBalance ?? '0');
  const netMovement = currentBalance - openingBalance;

  // Actions
  function handleStartEdit() {
    if (account) {
      setFormCode(account.code);
      setFormName(account.name);
      setFormType(account.accountType);
      setFormParentId(account.parentId ?? '');
      setFormCurrency(account.currencyCode);
      setFormDescription(account.description ?? '');
    }
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
  }

  function handleSave() {
    updateMutation.mutate(
      {
        id: accountId,
        data: {
          code: formCode,
          name: formName,
          accountType: formType,
          parentId: formParentId || null,
          currencyCode: formCurrency,
          description: formDescription || null,
        },
      },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  }

  function handleToggleActive() {
    if (!account) return;
    updateMutation.mutate({
      id: accountId,
      data: { isActive: !account.isActive },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(accountId, {
      onSuccess: () => router.push('/finance/accounts'),
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <FormPage
        title="Loading..."
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Chart of Accounts', href: '/finance/accounts' },
          { label: '...' },
        ]}
        backHref="/finance/accounts"
      >
        <DetailSkeleton />
      </FormPage>
    );
  }

  // Error state
  if (error || !account) {
    return (
      <FormPage
        title="Account Not Found"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Chart of Accounts', href: '/finance/accounts' },
          { label: 'Not Found' },
        ]}
        backHref="/finance/accounts"
      >
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">The account could not be found or an error occurred.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/finance/accounts')}>
            Back to Accounts
          </Button>
        </div>
      </FormPage>
    );
  }

  return (
    <FormPage
      title={`${account.code} - ${account.name}`}
      subtitle={capitalize(account.accountType) + ' Account'}
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Chart of Accounts', href: '/finance/accounts' },
        { label: account.name },
      ]}
      backHref="/finance/accounts"
      status={{
        label: account.isActive ? 'Active' : 'Inactive',
        variant: account.isActive ? 'success' : 'muted',
      }}
      primaryAction={
        isEditing
          ? {
              label: 'Save Changes',
              onClick: handleSave,
              loading: updateMutation.isPending,
            }
          : undefined
      }
      secondaryActions={
        isEditing
          ? [{ label: 'Cancel', onClick: handleCancelEdit, variant: 'outline' as const }]
          : [
              { label: 'Edit', onClick: handleStartEdit, variant: 'outline' as const },
              ...(!account.isSystem
                ? [
                    {
                      label: account.isActive ? 'Deactivate' : 'Activate',
                      onClick: handleToggleActive,
                      variant: 'outline' as const,
                    },
                  ]
                : []),
            ]
      }
      dangerAction={
        !account.isSystem && !account.isHeader
          ? { label: 'Delete', onClick: handleDelete, disabled: deleteMutation.isPending }
          : undefined
      }
      meta={[
        { label: 'Created', value: new Date(account.createdAt).toLocaleDateString() },
        { label: 'Updated', value: new Date(account.updatedAt).toLocaleDateString() },
        { label: 'Currency', value: account.currencyCode },
        ...(account.isSystem ? [{ label: 'System Account', value: <Badge variant="secondary">Yes</Badge> }] : []),
      ]}
    >
      <div className="space-y-6">
        {/* Account Information */}
        <FormSection title="Account Information" columns={2}>
          <FormField label="Code" required>
            {isEditing ? (
              <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} className="font-mono" />
            ) : (
              <p className="text-sm font-mono py-2">{account.code}</p>
            )}
          </FormField>

          <FormField label="Name" required>
            {isEditing ? (
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            ) : (
              <p className="text-sm py-2">{account.name}</p>
            )}
          </FormField>

          <FormField label="Account Type" required>
            {isEditing ? (
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {capitalize(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm py-2">
                <Badge variant={
                  ({ asset: 'default', liability: 'warning', equity: 'secondary', revenue: 'success', expense: 'destructive' } as const)[account.accountType] ?? 'outline'
                }>
                  {capitalize(account.accountType)}
                </Badge>
              </p>
            )}
          </FormField>

          <FormField label="Normal Balance">
            <p className="text-sm py-2">{capitalize(normalBalance)}</p>
          </FormField>

          <FormField label="Financial Statement">
            <p className="text-sm py-2">{labelFromSnake(financialStatement)}</p>
          </FormField>

          <FormField label="Parent Account">
            {isEditing ? (
              <Select value={formParentId} onValueChange={setFormParentId}>
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
            ) : (
              <p className="text-sm py-2">
                {account.parentId
                  ? parentOptions.find((o) => o.value === account.parentId)?.label ?? account.parentId
                  : 'None (top-level)'}
              </p>
            )}
          </FormField>

          <FormField label="Currency">
            {isEditing ? (
              <Input value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} />
            ) : (
              <p className="text-sm py-2">{account.currencyCode}</p>
            )}
          </FormField>

          <FormField label="Description">
            {isEditing ? (
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
            ) : (
              <p className="text-sm py-2 text-muted-foreground">{account.description || 'No description'}</p>
            )}
          </FormField>

          <FormField label="Is Header">
            <p className="text-sm py-2">{account.isHeader ? 'Yes' : 'No'}</p>
          </FormField>

          <FormField label="Is System">
            <p className="text-sm py-2">
              {account.isSystem ? <Badge variant="secondary">System Account</Badge> : 'No'}
            </p>
          </FormField>
        </FormSection>

        {/* Balance */}
        <FormSection title="Balance" columns={1} collapsible={false}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Opening Balance</p>
                <p className="mt-1 text-lg font-semibold font-mono tabular-nums">
                  {formatCurrency(openingBalance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className={`mt-1 text-lg font-semibold font-mono tabular-nums ${currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(currentBalance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Net Movement</p>
                <p className={`mt-1 text-lg font-semibold font-mono tabular-nums ${netMovement >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(netMovement)}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-2">
            <Link
              href={`/finance/reports/general-ledger?account=${accountId}`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View General Ledger
            </Link>
          </div>
        </FormSection>

        {/* Recent Transactions */}
        <FormSection title="Recent Transactions" columns={1}>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry #</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No transactions yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </FormSection>
      </div>
    </FormPage>
  );
}
