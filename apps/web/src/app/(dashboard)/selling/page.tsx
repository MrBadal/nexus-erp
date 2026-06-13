'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Users, FileText, Truck, DollarSign, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useSalesOrders, useCustomers, useQuotations, type SalesOrder } from '@/hooks/use-selling';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  invoiced: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function SellingDashboardPage() {
  const router = useRouter();
  const { data: ordersData, isLoading: ordersLoading } = useSalesOrders({ limit: 5, sort_by: 'created_at', sort_order: 'desc' });
  const { data: customersData } = useCustomers({ limit: 100 });
  const { data: quotationsData } = useQuotations({ limit: 100 });

  const orders = ordersData ?? [];
  const customers = customersData ?? [];
  const quotations = quotationsData ?? [];

  const totalRevenue = orders
    .filter((o: SalesOrder) => ['confirmed', 'delivered', 'invoiced'].includes(o.status))
    .reduce((sum: number, o: SalesOrder) => sum + (o.totalAmount || 0), 0);
  const openOrders = orders.filter((o: SalesOrder) => o.status === 'confirmed').length;
  const pendingQuotations = quotations.filter((q) => q.status === 'sent' || q.status === 'draft').length;
  const activeCustomers = customers.filter((c) => c.status === 'active').length;

  const kpis = [
    { title: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-green-600' },
    { title: 'Open Orders', value: String(openOrders), icon: ShoppingCart, color: 'text-blue-600' },
    { title: 'Pending Quotations', value: String(pendingQuotations), icon: FileText, color: 'text-amber-600' },
    { title: 'Active Customers', value: String(activeCustomers), icon: Users, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Selling</h1>
        <p className="text-sm text-muted-foreground">Sales overview and recent activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Sales Orders</CardTitle>
              <Link href="/selling/sales-orders" className="text-sm text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No sales orders yet. <Link href="/selling/sales-orders/new" className="text-primary hover:underline">Create your first order</Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Order #</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order: SalesOrder) => (
                    <tr key={order.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/selling/sales-orders/${order.id}`)}>
                      <td className="px-4 py-2 font-mono text-xs">{order.orderNumber}</td>
                      <td className="px-4 py-2">{order.customerName ?? order.customer ?? '\u2014'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[order.status] ?? ''}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/selling/customers" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted text-sm">
              <Users className="h-4 w-4 text-muted-foreground" /> Customers
            </Link>
            <Link href="/selling/sales-orders" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted text-sm">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" /> Sales Orders
            </Link>
            <Link href="/selling/quotations" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" /> Quotations
            </Link>
            <Link href="/selling/delivery-notes" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" /> Delivery Notes
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
