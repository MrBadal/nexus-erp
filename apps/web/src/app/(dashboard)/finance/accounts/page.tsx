"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Search, List, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";
import type { Account, AccountType } from "@/types/api";

// Sample data for demonstration
const sampleAccounts: Account[] = [
  {
    id: "1",
    code: "1000",
    name: "Cash and Cash Equivalents",
    type: "asset",
    balance: 125000.0,
    currency: "USD",
    isActive: true,
    isSystemAccount: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "2",
    code: "1100",
    name: "Accounts Receivable",
    type: "asset",
    balance: 67800.0,
    currency: "USD",
    isActive: true,
    isSystemAccount: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "3",
    code: "2000",
    name: "Accounts Payable",
    type: "liability",
    balance: 31200.0,
    currency: "USD",
    isActive: true,
    isSystemAccount: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "4",
    code: "3000",
    name: "Owner's Equity",
    type: "equity",
    balance: 500000.0,
    currency: "USD",
    isActive: true,
    isSystemAccount: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "5",
    code: "4000",
    name: "Sales Revenue",
    type: "revenue",
    balance: 284500.0,
    currency: "USD",
    isActive: true,
    isSystemAccount: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "6",
    code: "5000",
    name: "Cost of Goods Sold",
    type: "expense",
    balance: 98000.0,
    currency: "USD",
    isActive: true,
    isSystemAccount: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "7",
    code: "5100",
    name: "Salaries & Wages",
    type: "expense",
    balance: 44300.0,
    currency: "USD",
    isActive: true,
    isSystemAccount: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "8",
    code: "1200",
    name: "Inventory",
    type: "asset",
    balance: 89500.0,
    currency: "USD",
    isActive: true,
    isSystemAccount: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-15",
  },
];

const accountTypeColors: Record<AccountType, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  asset: "default",
  liability: "warning",
  equity: "secondary",
  revenue: "success",
  expense: "destructive",
};

const columns: ColumnDef<Account>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => <SortableHeader column={column} title="Code" />,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{row.getValue("code")}</span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Account Name" />,
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as AccountType;
      return (
        <Badge variant={accountTypeColors[type]}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "balance",
    header: ({ column }) => <SortableHeader column={column} title="Balance" />,
    cell: ({ row }) => (
      <span className="text-right font-mono">
        {formatCurrency(row.getValue("balance"))}
      </span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.getValue("isActive") ? "success" : "outline"}>
        {row.getValue("isActive") ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export default function ChartOfAccountsPage() {
  const [viewMode, setViewMode] = React.useState<"table" | "tree">("table");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s financial accounts
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search accounts..." className="pl-9" />
            </div>
            <div className="flex items-center gap-2 border rounded-md p-1">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="mr-1 h-4 w-4" />
                Table
              </Button>
              <Button
                variant={viewMode === "tree" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tree")}
              >
                <GitBranch className="mr-1 h-4 w-4" />
                Tree
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            All Accounts ({sampleAccounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sampleAccounts}
            searchPlaceholder="Filter by account name..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
