'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { ListPage } from '@/components/layout/list-page';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { StatusDot } from '@/components/ui/status-dot';
import { type FilterConfig } from '@/components/ui/filter-sidebar';
import { useAssetMaintenanceList } from '@/hooks/use-assets';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AssetMaintenance {
  id: string;
  assetNumber?: string;
  assetName?: string;
  maintenanceType?: 'preventive' | 'corrective' | 'calibration' | 'inspection';
  maintenanceDate?: string;
  nextMaintenanceDate?: string | null;
  cost?: number;
  performedBy?: string;
  status?: 'planned' | 'in_progress' | 'completed' | 'overdue';
}

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
  planned: 'info',
  in_progress: 'warning',
  completed: 'success',
  overdue: 'danger',
};

const typeVariant: Record<string, 'info' | 'warning' | 'default' | 'success'> = {
  preventive: 'info',
  corrective: 'warning',
  calibration: 'default',
  inspection: 'success',
};

const filterConfig: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'checkbox-group',
    options: [
      { label: 'Planned', value: 'planned' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Completed', value: 'completed' },
      { label: 'Overdue', value: 'overdue' },
    ],
  },
  {
    key: 'maintenanceType',
    label: 'Type',
    type: 'checkbox-group',
    options: [
      { label: 'Preventive', value: 'preventive' },
      { label: 'Corrective', value: 'corrective' },
      { label: 'Calibration', value: 'calibration' },
      { label: 'Inspection', value: 'inspection' },
    ],
  },
];

const columns: ColumnDef<AssetMaintenance, unknown>[] = [
  {
    accessorKey: 'assetName',
    header: ({ column }) => <SortableHeader column={column}>Asset</SortableHeader>,
    cell: ({ row }) => (
      <div>
        <Link
          href={`/assets/maintenance/${row.original.id}`}
          className="text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.assetName || '\u2014'}
        </Link>
        <div className="font-mono text-xs text-muted-foreground">{row.original.assetNumber || ''}</div>
      </div>
    ),
  },
  {
    accessorKey: 'maintenanceType',
    header: 'Type',
    cell: ({ row }) => {
      const t = row.original.maintenanceType || 'preventive';
      return <StatusDot status={typeVariant[t] || 'info'} label={t.charAt(0).toUpperCase() + t.slice(1)} />;
    },
  },
  {
    accessorKey: 'maintenanceDate',
    header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-sm">{row.original.maintenanceDate ? formatDate(row.original.maintenanceDate) : '\u2014'}</span>
    ),
  },
  {
    accessorKey: 'nextMaintenanceDate',
    header: 'Next Due',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.nextMaintenanceDate ? formatDate(row.original.nextMaintenanceDate) : '\u2014'}
      </span>
    ),
  },
  {
    accessorKey: 'performedBy',
    header: 'Performed By',
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.performedBy || '\u2014'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status || 'planned';
      return <StatusDot status={statusVariant[s] || 'info'} label={s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')} />;
    },
  },
  {
    accessorKey: 'cost',
    header: ({ column }) => <SortableHeader column={column}>Cost</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{formatCurrency(row.original.cost ?? 0)}</span>
    ),
  },
];

export default function AssetMaintenancePage() {
  const router = useRouter();
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAssetMaintenanceList();
  const maintenance = (data ?? []) as AssetMaintenance[];

  const total = maintenance.length;
  const planned = maintenance.filter((m) => m.status === 'planned').length;
  const overdue = maintenance.filter((m) => m.status === 'overdue').length;
  const totalCost = maintenance.reduce((sum, m) => sum + (m.cost ?? 0), 0);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFilterClear = useCallback(() => {
    setFilterValues({});
  }, []);

  const handleRowClick = useCallback(
    (row: AssetMaintenance) => {
      router.push(`/assets/maintenance/${row.id}`);
    },
    [router],
  );

  return (
    <ListPage
      title="Maintenance Schedule"
      subtitle="Track maintenance activities, schedules, and costs"
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Maintenance' },
      ]}
      createButton={{ label: 'New Maintenance', href: '/assets/maintenance/new' }}
      summaryCards={[
        { label: 'Total Records', value: total },
        { label: 'Planned', value: planned, icon: <span className="text-blue-600">&#9679;</span> },
        { label: 'Overdue', value: overdue, icon: <span className="text-red-600">&#9679;</span> },
        { label: 'Total Cost', value: formatCurrency(totalCost) },
      ]}
      filterConfig={filterConfig}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      onFilterClear={handleFilterClear}
    >
      <DataTable
        columns={columns}
        data={maintenance}
        isLoading={isLoading}
        searchPlaceholder="Search maintenance records..."
        searchValue={search}
        onSearchChange={setSearch}
        onRowClick={handleRowClick}
        emptyMessage="No maintenance records found."
        emptyAction={{
          label: 'Schedule Maintenance',
          onClick: () => router.push('/assets/maintenance/new'),
        }}
      />
    </ListPage>
  );
}
