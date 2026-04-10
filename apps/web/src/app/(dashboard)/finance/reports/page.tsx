'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Scale,
  TrendingUp,
  BarChart3,
  Wallet,
  Users,
  Building2,
  ClipboardList,
  Receipt,
  FileCheck,
} from 'lucide-react';

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const reports: ReportCard[] = [
  {
    title: 'General Ledger',
    description: 'View all journal entry lines with running balances by account.',
    href: '/finance/reports/general-ledger',
    icon: FileText,
  },
  {
    title: 'Trial Balance',
    description: 'Summary of all account balances to verify debits equal credits.',
    href: '/finance/reports/trial-balance',
    icon: Scale,
  },
  {
    title: 'Profit & Loss',
    description: 'Revenue and expense summary showing net income for a period.',
    href: '/finance/reports/profit-loss',
    icon: TrendingUp,
  },
  {
    title: 'Balance Sheet',
    description: 'Snapshot of assets, liabilities, and equity at a point in time.',
    href: '/finance/reports/balance-sheet',
    icon: BarChart3,
  },
  {
    title: 'Receivable Aging',
    description: 'Outstanding customer invoices grouped by aging buckets.',
    href: '/finance/reports/receivable-aging',
    icon: Users,
  },
  {
    title: 'Payable Aging',
    description: 'Outstanding supplier bills grouped by aging buckets.',
    href: '/finance/reports/payable-aging',
    icon: Building2,
  },
  {
    title: 'Budget Variance',
    description: 'Compare budgeted vs actual amounts with variance analysis.',
    href: '/finance/reports/budget-variance',
    icon: ClipboardList,
  },
  {
    title: 'TDS Payment',
    description: 'TDS deductions by vendor with totals for a fiscal year and quarter.',
    href: '/finance/reports/tds-payment',
    icon: Receipt,
  },
  {
    title: 'TDS Return (26Q)',
    description: 'TDS return data in 26Q filing format for quarterly submission.',
    href: '/finance/reports/tds-return',
    icon: FileCheck,
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Financial Reports"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Reports' },
        ]}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Link key={report.href} href={report.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{report.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
