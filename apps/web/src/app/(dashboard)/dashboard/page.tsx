'use client';

import Link from 'next/link';
import {
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Receipt,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-dot';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { useInvoices } from '@/hooks/use-invoices';
import { RevenueExpenseChart } from '@/components/charts/revenue-expense-chart';
import { CashFlowChart } from '@/components/charts/cash-flow-chart';
import type { LucideIcon } from 'lucide-react';

// --- Demo data ---

interface KpiItem {
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
}

const kpiData: KpiItem[] = [
  { label: 'Revenue', value: 284500, change: '+12.5%', trend: 'up', icon: DollarSign },
  { label: 'Expenses', value: 156200, change: '+3.2%', trend: 'up', icon: ArrowDownRight },
  { label: 'Accounts Receivable', value: 89300, change: '-5.1%', trend: 'down', icon: FileText },
  { label: 'Accounts Payable', value: 45600, change: '+8.7%', trend: 'up', icon: Receipt },
];

const revenueData = [
  { month: 'Apr', revenue: 18500, expenses: 12300 },
  { month: 'May', revenue: 21000, expenses: 13100 },
  { month: 'Jun', revenue: 19800, expenses: 12800 },
  { month: 'Jul', revenue: 23500, expenses: 14200 },
  { month: 'Aug', revenue: 22100, expenses: 13600 },
  { month: 'Sep', revenue: 24800, expenses: 14900 },
  { month: 'Oct', revenue: 26200, expenses: 15100 },
  { month: 'Nov', revenue: 25400, expenses: 14700 },
  { month: 'Dec', revenue: 27100, expenses: 15300 },
  { month: 'Jan', revenue: 24600, expenses: 14400 },
  { month: 'Feb', revenue: 26900, expenses: 15000 },
  { month: 'Mar', revenue: 28400, expenses: 15600 },
];

const cashFlowData = [
  { month: 'Apr', inflow: 22000, outflow: 15000 },
  { month: 'May', inflow: 24500, outflow: 16200 },
  { month: 'Jun', inflow: 21800, outflow: 14900 },
  { month: 'Jul', inflow: 26000, outflow: 17100 },
  { month: 'Aug', inflow: 25200, outflow: 16500 },
  { month: 'Sep', inflow: 27800, outflow: 17800 },
  { month: 'Oct', inflow: 29100, outflow: 18200 },
  { month: 'Nov', inflow: 28300, outflow: 17600 },
  { month: 'Dec', inflow: 30500, outflow: 18900 },
  { month: 'Jan', inflow: 27400, outflow: 17200 },
  { month: 'Feb', inflow: 29800, outflow: 18100 },
  { month: 'Mar', inflow: 31200, outflow: 19000 },
];

const demoJournalEntries = [
  { id: '1', entryNumber: 'JE-0092', date: '2026-03-12', description: 'Monthly rent payment', totalDebit: '4500.00', status: 'posted' as const },
  { id: '2', entryNumber: 'JE-0091', date: '2026-03-11', description: 'Office supplies purchase', totalDebit: '285.00', status: 'posted' as const },
  { id: '3', entryNumber: 'JE-0090', date: '2026-03-10', description: 'Client payment received', totalDebit: '12800.00', status: 'posted' as const },
  { id: '4', entryNumber: 'JE-0089', date: '2026-03-09', description: 'Payroll processing', totalDebit: '28500.00', status: 'draft' as const },
  { id: '5', entryNumber: 'JE-0088', date: '2026-03-08', description: 'Utility bill payment', totalDebit: '1250.00', status: 'posted' as const },
];

const demoOverdueInvoices = [
  { id: '1', invoiceNumber: 'INV-2026-0098', customer: 'Acme Corp', dueDate: '2026-02-28', total: '15200.00', daysOverdue: 13 },
  { id: '2', invoiceNumber: 'INV-2026-0091', customer: 'TechStart Inc', dueDate: '2026-02-20', total: '8400.00', daysOverdue: 21 },
  { id: '3', invoiceNumber: 'INV-2026-0085', customer: 'Global Services', dueDate: '2026-02-15', total: '22600.00', daysOverdue: 26 },
  { id: '4', invoiceNumber: 'INV-2026-0079', customer: 'Summit Partners', dueDate: '2026-02-10', total: '6750.00', daysOverdue: 31 },
  { id: '5', invoiceNumber: 'INV-2026-0072', customer: 'BlueWave LLC', dueDate: '2026-02-05', total: '11300.00', daysOverdue: 36 },
];

// --- Components ---

function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;
  const isPositiveTrend = item.trend === 'up';

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
        <div className="mt-1 flex items-center gap-1 text-xs">
          {isPositiveTrend ? (
            <span className="flex items-center text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
              {item.change}
            </span>
          ) : (
            <span className="flex items-center text-red-600 dark:text-red-400">
              <ArrowDownRight className="h-3 w-3" />
              {item.change}
            </span>
          )}
          <span className="text-muted-foreground">vs. last month</span>
        </div>
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
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function RecentTransactions() {
  const { data: entries, isLoading, isError } = useJournalEntries({ limit: 5 });

  const displayEntries = isError || !entries?.length
    ? demoJournalEntries
    : entries.slice(0, 5);
  const isDemo = isError || !entries?.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          {isDemo && <Badge variant="secondary" className="text-[10px]">Demo data</Badge>}
        </div>
        <Link href="/finance/journal-entries">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          <div className="grid grid-cols-[80px_1fr_100px_80px] gap-2 border-b pb-2 text-xs font-medium text-muted-foreground">
            <span>Entry #</span>
            <span>Description</span>
            <span className="text-right">Amount</span>
            <span className="text-center">Status</span>
          </div>
          {displayEntries.map((entry) => {
            const statusVariant = entry.status === 'posted' ? 'success' : entry.status === 'draft' ? 'warning' : 'info';
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
      </CardContent>
    </Card>
  );
}

function OverdueInvoices() {
  const { data: invoices, isLoading, isError } = useInvoices({ status: 'overdue' });

  const displayInvoices = isError || !invoices?.length
    ? demoOverdueInvoices
    : invoices.slice(0, 5).map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customerId ?? 'Unknown',
        dueDate: inv.dueDate,
        total: inv.total,
        daysOverdue: Math.floor(
          (Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));
  const isDemo = isError || !invoices?.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Overdue Invoices</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Overdue Invoices</CardTitle>
          {isDemo && <Badge variant="secondary" className="text-[10px]">Demo data</Badge>}
        </div>
        <Link href="/finance/invoices">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

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
        <Button size="sm" variant="outline" disabled className="gap-1.5" title="Coming soon">
          <DollarSign className="h-3.5 w-3.5" />
          Record Payment
        </Button>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.firstName ?? 'User'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here is an overview of your business performance.
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Demo data
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueExpenseChart data={revenueData} />
        <CashFlowChart data={cashFlowData} />
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
