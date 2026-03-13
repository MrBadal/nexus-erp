"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader } from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { JournalEntry, JournalEntryStatus } from "@/types/api";

const statusVariants: Record<JournalEntryStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "warning",
  approved: "secondary",
  posted: "success",
  voided: "destructive",
};

const sampleEntries: JournalEntry[] = [
  {
    id: "1",
    entryNumber: "JE-2024-0089",
    date: "2024-01-15",
    description: "Monthly rent payment",
    status: "posted",
    lines: [],
    totalDebit: 5000.0,
    totalCredit: 5000.0,
    createdBy: "Michael Chen",
    approvedBy: "Sarah Johnson",
    postedAt: "2024-01-15T14:30:00Z",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T14:30:00Z",
  },
  {
    id: "2",
    entryNumber: "JE-2024-0090",
    date: "2024-01-16",
    description: "Client payment received - Acme Corp",
    status: "posted",
    lines: [],
    totalDebit: 12500.0,
    totalCredit: 12500.0,
    createdBy: "Sarah Johnson",
    approvedBy: "Sarah Johnson",
    postedAt: "2024-01-16T09:00:00Z",
    createdAt: "2024-01-16T08:30:00Z",
    updatedAt: "2024-01-16T09:00:00Z",
  },
  {
    id: "3",
    entryNumber: "JE-2024-0091",
    date: "2024-01-17",
    description: "Office supplies purchase",
    status: "pending",
    lines: [],
    totalDebit: 850.0,
    totalCredit: 850.0,
    createdBy: "Emily Davis",
    createdAt: "2024-01-17T11:00:00Z",
    updatedAt: "2024-01-17T11:00:00Z",
  },
  {
    id: "4",
    entryNumber: "JE-2024-0092",
    date: "2024-01-18",
    description: "Payroll disbursement - January",
    status: "approved",
    lines: [],
    totalDebit: 44300.0,
    totalCredit: 44300.0,
    createdBy: "Michael Chen",
    approvedBy: "Sarah Johnson",
    createdAt: "2024-01-18T10:00:00Z",
    updatedAt: "2024-01-18T15:00:00Z",
  },
  {
    id: "5",
    entryNumber: "JE-2024-0093",
    date: "2024-01-19",
    description: "Depreciation entry - Q1",
    status: "draft",
    lines: [],
    totalDebit: 3200.0,
    totalCredit: 3200.0,
    createdBy: "Michael Chen",
    createdAt: "2024-01-19T16:00:00Z",
    updatedAt: "2024-01-19T16:00:00Z",
  },
];

const columns: ColumnDef<JournalEntry>[] = [
  {
    accessorKey: "entryNumber",
    header: ({ column }) => <SortableHeader column={column} title="Entry #" />,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium text-primary">
        {row.getValue("entryNumber")}
      </span>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader column={column} title="Date" />,
    cell: ({ row }) => formatDate(row.getValue("date")),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="max-w-[300px] truncate">{row.getValue("description")}</span>
    ),
  },
  {
    accessorKey: "totalDebit",
    header: ({ column }) => <SortableHeader column={column} title="Debit" />,
    cell: ({ row }) => (
      <span className="font-mono text-right">
        {formatCurrency(row.getValue("totalDebit"))}
      </span>
    ),
  },
  {
    accessorKey: "totalCredit",
    header: ({ column }) => <SortableHeader column={column} title="Credit" />,
    cell: ({ row }) => (
      <span className="font-mono text-right">
        {formatCurrency(row.getValue("totalCredit"))}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as JournalEntryStatus;
      return (
        <Badge variant={statusVariants[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.getValue("createdBy")}</span>
    ),
  },
];

export default function JournalEntriesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal Entries</h1>
          <p className="text-muted-foreground">
            Create and manage general ledger journal entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold">{sampleEntries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Posted</p>
            <p className="text-2xl font-bold text-emerald-600">
              {sampleEntries.filter((e) => e.status === "posted").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold text-amber-600">
              {sampleEntries.filter((e) => e.status === "pending" || e.status === "approved").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Drafts</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {sampleEntries.filter((e) => e.status === "draft").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sampleEntries}
            searchPlaceholder="Search entries..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
