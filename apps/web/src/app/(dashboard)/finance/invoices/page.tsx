"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, FileDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types/api";

const statusVariants: Record<InvoiceStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  viewed: "default",
  partial: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "destructive",
};

const sampleInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-2024-0138",
    type: "sales",
    status: "paid",
    customerName: "Acme Corporation",
    issueDate: "2024-01-05",
    dueDate: "2024-02-04",
    subtotal: 15000.0,
    taxAmount: 1350.0,
    totalAmount: 16350.0,
    amountPaid: 16350.0,
    amountDue: 0,
    currency: "USD",
    lines: [],
    createdAt: "2024-01-05",
    updatedAt: "2024-01-20",
  },
  {
    id: "2",
    invoiceNumber: "INV-2024-0139",
    type: "sales",
    status: "sent",
    customerName: "TechStart Inc.",
    issueDate: "2024-01-10",
    dueDate: "2024-02-09",
    subtotal: 8500.0,
    taxAmount: 765.0,
    totalAmount: 9265.0,
    amountPaid: 0,
    amountDue: 9265.0,
    currency: "USD",
    lines: [],
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
  {
    id: "3",
    invoiceNumber: "INV-2024-0140",
    type: "sales",
    status: "overdue",
    customerName: "Global Solutions Ltd.",
    issueDate: "2023-12-01",
    dueDate: "2023-12-31",
    subtotal: 22000.0,
    taxAmount: 1980.0,
    totalAmount: 23980.0,
    amountPaid: 0,
    amountDue: 23980.0,
    currency: "USD",
    lines: [],
    createdAt: "2023-12-01",
    updatedAt: "2024-01-15",
  },
  {
    id: "4",
    invoiceNumber: "INV-2024-0141",
    type: "sales",
    status: "partial",
    customerName: "Bright Media Co.",
    issueDate: "2024-01-12",
    dueDate: "2024-02-11",
    subtotal: 12000.0,
    taxAmount: 1080.0,
    totalAmount: 13080.0,
    amountPaid: 6540.0,
    amountDue: 6540.0,
    currency: "USD",
    lines: [],
    createdAt: "2024-01-12",
    updatedAt: "2024-01-18",
  },
  {
    id: "5",
    invoiceNumber: "INV-2024-0142",
    type: "sales",
    status: "draft",
    customerName: "Summit Partners",
    issueDate: "2024-01-19",
    dueDate: "2024-02-18",
    subtotal: 4500.0,
    taxAmount: 405.0,
    totalAmount: 4905.0,
    amountPaid: 0,
    amountDue: 4905.0,
    currency: "USD",
    lines: [],
    createdAt: "2024-01-19",
    updatedAt: "2024-01-19",
  },
];

const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => <SortableHeader column={column} title="Invoice #" />,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium text-primary">
        {row.getValue("invoiceNumber")}
      </span>
    ),
  },
  {
    accessorKey: "customerName",
    header: ({ column }) => <SortableHeader column={column} title="Customer" />,
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("customerName")}</span>
    ),
  },
  {
    accessorKey: "issueDate",
    header: ({ column }) => <SortableHeader column={column} title="Issue Date" />,
    cell: ({ row }) => formatDate(row.getValue("issueDate")),
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => <SortableHeader column={column} title="Due Date" />,
    cell: ({ row }) => formatDate(row.getValue("dueDate")),
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => <SortableHeader column={column} title="Total" />,
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.getValue("totalAmount"))}</span>
    ),
  },
  {
    accessorKey: "amountDue",
    header: "Amount Due",
    cell: ({ row }) => {
      const due = row.getValue("amountDue") as number;
      return (
        <span className={`font-mono ${due > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          {formatCurrency(due)}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as InvoiceStatus;
      return (
        <Badge variant={statusVariants[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
];

export default function InvoicesPage() {
  const totalOutstanding = sampleInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  const overdueCount = sampleInvoices.filter((inv) => inv.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">
            Create, send, and track customer invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold">{sampleInvoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalOutstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Paid This Month</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(
                sampleInvoices
                  .filter((inv) => inv.status === "paid")
                  .reduce((sum, inv) => sum + inv.totalAmount, 0)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sampleInvoices}
            searchPlaceholder="Search by customer..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
