"use client";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Activity,
  FileText,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency } from "@/lib/utils";

const metrics = [
  {
    title: "Total Revenue",
    value: 284500.0,
    change: 12.5,
    trend: "up" as const,
    icon: DollarSign,
    description: "vs. last month",
  },
  {
    title: "Total Expenses",
    value: 142300.0,
    change: -3.2,
    trend: "down" as const,
    icon: CreditCard,
    description: "vs. last month",
  },
  {
    title: "Accounts Receivable",
    value: 67800.0,
    change: 8.1,
    trend: "up" as const,
    icon: TrendingUp,
    description: "outstanding",
  },
  {
    title: "Accounts Payable",
    value: 31200.0,
    change: -5.4,
    trend: "down" as const,
    icon: TrendingDown,
    description: "outstanding",
  },
];

const recentActivity = [
  {
    id: "1",
    action: "Invoice #INV-2024-0142 created",
    module: "Finance",
    user: "Sarah Johnson",
    time: "2 minutes ago",
  },
  {
    id: "2",
    action: "Journal entry JE-0089 posted",
    module: "Finance",
    user: "Michael Chen",
    time: "15 minutes ago",
  },
  {
    id: "3",
    action: "New employee onboarded: James Wilson",
    module: "HR",
    user: "Emily Davis",
    time: "1 hour ago",
  },
  {
    id: "4",
    action: "Payment received from Acme Corp",
    module: "Finance",
    user: "System",
    time: "2 hours ago",
  },
  {
    id: "5",
    action: "Inventory stock updated: SKU-4421",
    module: "Inventory",
    user: "Robert Brown",
    time: "3 hours ago",
  },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.firstName ?? "User"}
        </h1>
        <p className="text-muted-foreground">
          Here is an overview of your business performance.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metric.value)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                {metric.trend === "up" ? (
                  <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3" />
                    {Math.abs(metric.change)}%
                  </span>
                ) : (
                  <span className="flex items-center text-red-600 dark:text-red-400">
                    <ArrowDownRight className="h-3 w-3" />
                    {Math.abs(metric.change)}%
                  </span>
                )}
                <span className="text-muted-foreground">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts placeholder + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Charts area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly comparison for the current fiscal year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
              <div className="text-center">
                <Activity className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Charts will render here with live data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Current period summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Open Invoices</span>
              </div>
              <Badge variant="secondary">24</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Pending Payments</span>
              </div>
              <Badge variant="warning">12</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Active Employees</span>
              </div>
              <Badge variant="success">156</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Net Profit Margin</span>
              </div>
              <Badge variant="success">18.3%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions across your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    by {activity.user}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{activity.module}</Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
