'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  DollarSign,
  AlertCircle,
  ArrowDownRight,
  BarChart3,
  FileText,
  Receipt,
  Plus,
  ArrowRight,
  Scale,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-dot';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDashboardKpis } from '@/hooks/use-dashboard';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { useInvoices } from '@/hooks/use-invoices';
import { apiErrorMessage } from '@/lib/api';
import { RevenueExpenseChart } from '@/components/charts/revenue-expense-chart';
import type { LucideIcon } from 'lucide-react';

// --- Helpers ---

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// --- KPI cards ---

interface KpiItem {
  label: string;
  value: number;
  icon: LucideIcon;
}

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {item.label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(item.value)}</div>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-32" />
      </CardContent>
    </Card>
  );
}

// --- Charts ---

function ChartEmptyState({
  title,
  description,
  message,
}: {
  title: string;
  description: string;
  message: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">No data yet</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Recent transactions ---

function RecentTransactions() {
  const { data: entries, isLoading, isError, error } = useJournalEntries({ limit: 5 });

  const displayEntries = (entries ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
        <Link href="/finance/journal-entries">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorAlert message={apiErrorMessage(error, 'Failed to load transactions')} />
        ) : displayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No transactions yet</p>
            <p className="text-xs text-muted-foreground">
              Journal entries will appear here once created.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="grid grid-cols-[80px_1fr_100px_80px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
              <span>Entry #</span>
              <span>Description</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Status</span>
            </div>
            {displayEntries.map((entry) => {
              const statusVariant =
                entry.status === 'posted' ? 'success' : entry.status === 'draft' ? 'warning' : 'info';
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-[80px_1fr_100px_80px] gap-2 border-b py-2.5 text-sm last:border-0"
                >
                  <span className="font-mono text-xs">{entry.entryNumber}</span>
                  <span className="truncate text-muted-foreground">
                    {entry.description ?? 'No description'}
                  </span>
                  <span className="text-right font-medium">
                    {formatCurrency(parseFloat(entry.totalDebit))}
                  </span>
                  <span className="flex items-center justify-center">
                    <StatusDot status={statusVariant} label={entry.status} size="sm" />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Overdue invoices ---

function OverdueInvoices() {
  const { data: invoices, isLoading, isError, error } = useInvoices({ status: 'overdue' });

  const displayInvoices = useMemo(
    () =>
      (invoices ?? []).slice(0, 5).map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customerId ?? 'Unknown',
        dueDate: inv.dueDate,
        total: inv.total,
        daysOverdue: Math.max(
          0,
          Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        ),
      })),
    [invoices],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Overdue Invoices</CardTitle>
        <Link href="/finance/invoices">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorAlert message={apiErrorMessage(error, 'Failed to load overdue invoices')} />
        ) : displayInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No overdue invoices</p>
            <p className="text-xs text-muted-foreground">
              You are all caught up on receivables.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            <div className="grid grid-cols-[100px_1fr_90px_90px_70px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
              <span>Invoice #</span>
              <span>Customer</span>
              <span>Due Date</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Overdue</span>
            </div>
            {displayInvoices.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-[100px_1fr_90px_90px_70px] gap-2 border-b py-2.5 text-sm last:border-0"
              >
                <span className="font-mono text-xs">{inv.invoiceNumber}</span>
                <span className="truncate text-muted-foreground">{inv.customer}</span>
                <span className="text-xs text-muted-foreground">{formatDate(inv.dueDate)}</span>
                <span className="text-right font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(parseFloat(inv.total))}
                </span>
                <span className="text-right text-xs font-medium text-red-600 dark:text-red-400">
                  {inv.daysOverdue}d
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Quick actions ---

function QuickActions() {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-medium text-muted-foreground">Quick Actions:</span>
        <Link href="/finance/invoices/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Invoice
          </Button>
        </Link>
        <Link href="/finance/journal-entries/new">
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Journal Entry
          </Button>
        </Link>
        <Link href="/finance/payments/new">
          <Button size="sm" variant="outline" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Record Payment
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: kpis, isLoading, isError, error } = useDashboardKpis();

  const kpiItems: KpiItem[] = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: 'Revenue', value: kpis.totalRevenue, icon: DollarSign },
      { label: 'Expenses', value: kpis.totalExpenses, icon: ArrowDownRight },
      { label: 'Net Income', value: kpis.netIncome, icon: Scale },
      { label: 'Accounts Receivable', value: kpis.accountsReceivable, icon: FileText },
      { label: 'Accounts Payable', value: kpis.accountsPayable, icon: Receipt },
      { label: 'Cash Balance', value: kpis.cashBalance, icon: Wallet },
    ];
  }, [kpis]);

  const revenueTrend = useMemo(
    () =>
      (kpis?.monthlyRevenueTrend ?? []).map((point) => ({
        month: monthLabel(point.month),
        revenue: point.revenue,
      })),
    [kpis],
  );

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.firstName ?? 'User'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is an overview of your business performance.
        </p>
      </div>

      {isError && (
        <ErrorAlert message={apiErrorMessage(error, 'Failed to load dashboard KPIs')} />
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
          : kpiItems.map((item) => <KpiCard key={item.label} item={item} />)}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ) : revenueTrend.length > 0 ? (
          <RevenueExpenseChart data={revenueTrend} />
        ) : (
          <ChartEmptyState
            title="Revenue"
            description="Last 12 months"
            message="Post revenue journal entries to see the monthly trend."
          />
        )}

        {/* The backend does not yet provide a monthly cash inflow/outflow
            series, so render an honest empty state instead of demo numbers. */}
        <ChartEmptyState
          title="Cash Flow"
          description="Inflow vs Outflow - Last 12 months"
          message="A monthly cash flow series is not available yet."
        />
      </div>

      {/* Bottom Row: Recent Transactions + Overdue Invoices */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentTransactions />
        <OverdueInvoices />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
