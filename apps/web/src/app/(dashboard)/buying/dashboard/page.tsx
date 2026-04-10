'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProcurementDashboard } from '@/hooks/use-procurement-dashboard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingCart, ClipboardList, CheckSquare, Package } from 'lucide-react';

export default function ProcurementDashboardPage() {
  const { data, isLoading } = useProcurementDashboard();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Procurement Dashboard"
          breadcrumbs={[
            { label: 'Buying', href: '/buying' },
            { label: 'Dashboard' },
          ]}
        />
        <div className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  const openPOs = data?.openPOs ?? { count: 0, value: 0 };
  const pendingMRs = data?.pendingMRs ?? 0;
  const pendingApprovals = data?.pendingApprovals ?? 0;
  const topSuppliers = data?.topSuppliers ?? [];
  const recentGRNs = data?.recentGRNs ?? [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Procurement Dashboard"
        breadcrumbs={[
          { label: 'Buying', href: '/buying' },
          { label: 'Dashboard' },
        ]}
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open POs</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openPOs.count}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(openPOs.value)} total value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open PO Value</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(openPOs.value)}</div>
              <p className="text-xs text-muted-foreground">{openPOs.count} orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending MRs</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingMRs}</div>
              <p className="text-xs text-muted-foreground">Material requests awaiting action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Items awaiting your approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Suppliers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Top Suppliers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topSuppliers.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No data found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Supplier</th>
                      <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSuppliers.map((s, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2">{s.name}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(s.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Recent GRNs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Recent GRNs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentGRNs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No data found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Receipt #</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Supplier</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGRNs.map((grn, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-2 font-mono text-xs">{grn.receiptNumber}</td>
                        <td className="px-4 py-2">{grn.supplier}</td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(grn.receiptDate)}</td>
                        <td className="px-4 py-2">
                          <span className="capitalize text-xs">{grn.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
