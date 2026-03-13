'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type Column,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Columns3,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { Skeleton } from './skeleton';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BulkAction<TData> {
  label: string;
  icon?: React.ReactNode;
  onClick: (rows: TData[]) => void;
  variant?: 'default' | 'destructive';
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // Server-side pagination
  pageCount?: number;
  pageIndex?: number;
  pageSize?: number;
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
  totalCount?: number;
  // Row selection
  enableSelection?: boolean;
  onSelectionChange?: (rows: TData[]) => void;
  // Bulk actions (shown when rows selected)
  bulkActions?: BulkAction<TData>[];
  // Column visibility toggle
  enableColumnVisibility?: boolean;
  // Server-side sorting
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  // Search
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  // Loading
  isLoading?: boolean;
  // Empty state
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  // CSV Export
  enableExport?: boolean;
  exportFilename?: string;
  // Row click navigation
  onRowClick?: (row: TData) => void;
  // Compact mode (even denser)
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// CSV Export helper
// ---------------------------------------------------------------------------

function exportToCsv<TData>(
  rows: TData[],
  columns: ColumnDef<TData, unknown>[],
  visibleColumnIds: string[],
  filename: string
) {
  // Build header row from visible columns that have an id or accessorKey
  const exportColumns = columns.filter((col) => {
    const id =
      (col as unknown as Record<string, unknown>).accessorKey as string | undefined ??
      col.id;
    return id && visibleColumnIds.includes(id as string);
  });

  const headers = exportColumns.map((col) => {
    const header = col.header;
    if (typeof header === 'string') return header;
    const id =
      (col as unknown as Record<string, unknown>).accessorKey as string | undefined ??
      col.id ??
      '';
    return String(id);
  });

  const csvRows: string[] = [headers.join(',')];

  for (const row of rows) {
    const values = exportColumns.map((col) => {
      const key =
        (col as unknown as Record<string, unknown>).accessorKey as string | undefined ??
        col.id;
      if (!key) return '';
      const val = (row as Record<string, unknown>)[key as string];
      const str = val == null ? '' : String(val);
      // Escape double quotes and wrap in quotes if contains comma/newline/quote
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// SortableHeader – exported for use in column definitions
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SortableHeader({
  column,
  children,
  title,
}: {
  column: Column<any, unknown>;
  children?: React.ReactNode;
  /** @deprecated Use children instead */
  title?: string;
}) {
  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 font-medium"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {children ?? title}
      {sorted === 'asc' ? (
        <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/50" />
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount: controlledPageCount,
  pageIndex: controlledPageIndex,
  pageSize: controlledPageSize = 50,
  onPaginationChange,
  totalCount,
  enableSelection = false,
  onSelectionChange,
  bulkActions,
  enableColumnVisibility = false,
  sorting: controlledSorting,
  onSortingChange,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  isLoading = false,
  emptyMessage = 'No results found.',
  emptyAction,
  enableExport = false,
  exportFilename = 'export',
  onRowClick,
  compact = false,
}: DataTableProps<TData, TValue>) {
  // Internal state (used when not server-controlled)
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [internalPageIndex, setInternalPageIndex] = React.useState(0);
  const [internalPageSize, setInternalPageSize] = React.useState(controlledPageSize);

  const isServerPagination = onPaginationChange != null;
  const isServerSorting = onSortingChange != null;

  const currentPageIndex = isServerPagination
    ? (controlledPageIndex ?? 0)
    : internalPageIndex;
  const currentPageSize = isServerPagination
    ? controlledPageSize
    : internalPageSize;
  const currentSorting = isServerSorting
    ? (controlledSorting ?? [])
    : internalSorting;

  // Build columns with optional selection column
  const tableColumns = React.useMemo(() => {
    if (!enableSelection) return columns;

    const selectionColumn: ColumnDef<TData, unknown> = {
      id: '_select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    };

    return [selectionColumn, ...columns] as ColumnDef<TData, TValue>[];
  }, [columns, enableSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: isServerSorting ? undefined : getSortedRowModel(),
    // Pagination
    manualPagination: isServerPagination,
    pageCount: isServerPagination ? (controlledPageCount ?? -1) : undefined,
    // Sorting
    manualSorting: isServerSorting,
    // State
    state: {
      sorting: currentSorting,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPageIndex,
        pageSize: currentPageSize,
      },
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(currentSorting) : updater;
      if (isServerSorting) {
        onSortingChange(next);
      } else {
        setInternalSorting(next);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableSelection,
  });

  // Notify parent about selection changes
  React.useEffect(() => {
    if (!onSelectionChange) return;
    const selectedRows = table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original);
    onSelectionChange(selectedRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  const selectedCount = Object.keys(rowSelection).length;
  const rows = table.getRowModel().rows;
  const visibleColumnIds = table
    .getVisibleLeafColumns()
    .map((c) => c.id)
    .filter((id) => id !== '_select');

  // Pagination calculations
  const total = totalCount ?? data.length;
  const from = total === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const to = Math.min((currentPageIndex + 1) * currentPageSize, total);
  const computedPageCount =
    controlledPageCount ?? Math.ceil(total / currentPageSize);
  const canPrevious = currentPageIndex > 0;
  const canNext = currentPageIndex < computedPageCount - 1;

  function handlePageChange(newIndex: number, newSize?: number) {
    const size = newSize ?? currentPageSize;
    if (isServerPagination) {
      onPaginationChange(newIndex, size);
    } else {
      setInternalPageIndex(newIndex);
      if (newSize != null) setInternalPageSize(newSize);
    }
  }

  // Row height classes
  const rowHeightClass = compact ? 'h-8' : 'h-9';
  const cellPadding = compact ? 'px-2 py-0.5' : 'px-3 py-1';
  const headerPadding = compact ? 'px-2 py-1' : 'px-3 py-1.5';

  // Skeleton row count for loading state
  const skeletonRows = currentPageSize > 10 ? 10 : currentPageSize;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          {onSearchChange != null && (
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export */}
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() =>
                exportToCsv(data, columns as ColumnDef<TData, unknown>[], visibleColumnIds, exportFilename)
              }
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          )}

          {/* Column visibility */}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Columns3 className="mr-1.5 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {table
                  .getAllColumns()
                  .filter(
                    (col) =>
                      typeof col.accessorFn !== 'undefined' &&
                      col.getCanHide()
                  )
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      className="capitalize"
                      checked={col.getIsVisible()}
                      onCheckedChange={(value) =>
                        col.toggleVisibility(!!value)
                      }
                    >
                      {col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const selectedRows = table
                    .getFilteredSelectedRowModel()
                    .rows.map((r) => r.original);
                  action.onClick(selectedRows);
                }}
              >
                {action.icon && (
                  <span className="mr-1">{action.icon}</span>
                )}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <table className="erp-table w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      headerPadding,
                      'text-left align-middle text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                      '[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0'
                    )}
                    style={
                      header.getSize() !== 150
                        ? { width: header.getSize() }
                        : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b">
                  {tableColumns.map((_, j) => (
                    <td key={`skeleton-${i}-${j}`} className={cn(cellPadding, rowHeightClass)}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        cellPadding,
                        rowHeightClass,
                        'align-middle',
                        '[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0'
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              // Empty state
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <p className="text-sm text-muted-foreground">
                      {emptyMessage}
                    </p>
                    {emptyAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={emptyAction.onClick}
                      >
                        {emptyAction.label}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-1 text-sm">
        <div className="text-muted-foreground">
          {total > 0 ? (
            <>
              Showing {from}-{to} of {total} results
            </>
          ) : (
            '0 results'
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Rows</span>
            <Select
              value={String(currentPageSize)}
              onValueChange={(val) => {
                const newSize = Number(val);
                handlePageChange(0, newSize);
              }}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page info */}
          <span className="text-muted-foreground text-xs">
            Page {currentPageIndex + 1} of {Math.max(computedPageCount, 1)}
          </span>

          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(currentPageIndex - 1)}
              disabled={!canPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePageChange(currentPageIndex + 1)}
              disabled={!canNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
