'use client';

import * as React from 'react';
import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { CurrencyInput } from './currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Plus, X } from 'lucide-react';

// Column definition for inline grid
export interface InlineGridColumn<T> {
  key: keyof T & string;
  header: string;
  type: 'text' | 'number' | 'currency' | 'select' | 'readonly';
  width?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  readOnly?: boolean;
  align?: 'left' | 'right' | 'center';
  placeholder?: string;
  currency?: string;
}

export interface InlineGridFooterItem {
  label: string;
  value: string | number;
  variant?: 'default' | 'danger' | 'success';
  colSpan?: number;
}

export interface InlineGridProps<T extends Record<string, unknown>> {
  columns: InlineGridColumn<T>[];
  rows: T[];
  onChange: (rows: T[]) => void;
  onAddRow: () => void;
  onRemoveRow?: (index: number) => void;
  footer?: InlineGridFooterItem[];
  maxRows?: number;
  minRows?: number;
  disabled?: boolean;
  className?: string;
  addRowLabel?: string;
}

export function InlineGrid<T extends Record<string, unknown>>({
  columns,
  rows,
  onChange,
  onAddRow,
  onRemoveRow,
  footer,
  maxRows,
  minRows = 1,
  disabled = false,
  className,
  addRowLabel = 'Add Row',
}: InlineGridProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleCellChange = useCallback(
    (rowIndex: number, key: keyof T & string, value: unknown) => {
      const updated = rows.map((row, i) =>
        i === rowIndex ? { ...row, [key]: value } : row
      );
      onChange(updated);
    },
    [rows, onChange]
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      rowIndex: number,
      colIndex: number
    ) => {
      if (e.key !== 'Tab') return;

      const editableColumns = columns.filter(
        (col) => col.type !== 'readonly' && !col.readOnly
      );
      const totalEditable = editableColumns.length;

      // Find position within editable columns
      let editableIndex = 0;
      let count = 0;
      for (let i = 0; i <= colIndex; i++) {
        if (columns[i].type !== 'readonly' && !columns[i].readOnly) {
          editableIndex = count;
          count++;
        }
      }

      const isLastEditableCol = editableIndex === totalEditable - 1;
      const isFirstEditableCol = editableIndex === 0;
      const isLastRow = rowIndex === rows.length - 1;
      const isFirstRow = rowIndex === 0;

      if (!e.shiftKey && isLastEditableCol && !isLastRow) {
        // Tab forward from last editable col: go to first editable col of next row
        e.preventDefault();
        focusCell(rowIndex + 1, getFirstEditableColIndex());
      } else if (e.shiftKey && isFirstEditableCol && !isFirstRow) {
        // Tab backward from first editable col: go to last editable col of previous row
        e.preventDefault();
        focusCell(rowIndex - 1, getLastEditableColIndex());
      }
    },
    [columns, rows.length]
  );

  const getFirstEditableColIndex = (): number => {
    return columns.findIndex(
      (col) => col.type !== 'readonly' && !col.readOnly
    );
  };

  const getLastEditableColIndex = (): number => {
    for (let i = columns.length - 1; i >= 0; i--) {
      if (columns[i].type !== 'readonly' && !columns[i].readOnly) {
        return i;
      }
    }
    return 0;
  };

  const focusCell = (rowIndex: number, colIndex: number) => {
    if (!tableRef.current) return;
    const row = tableRef.current.querySelectorAll('tbody tr')[rowIndex];
    if (!row) return;
    // +1 for the row number column
    const cell = row.querySelectorAll('td')[colIndex + 1];
    if (!cell) return;
    const input = cell.querySelector<HTMLElement>(
      'input, button[role="combobox"]'
    );
    if (input) {
      requestAnimationFrame(() => input.focus());
    }
  };

  const canAddRow = !maxRows || rows.length < maxRows;
  const canRemoveRow = rows.length > minRows;

  const gridTemplateColumns = [
    '40px', // row number
    ...columns.map((col) => col.width ?? '1fr'),
    '36px', // remove button
  ].join(' ');

  return (
    <div className={cn('rounded-md border border-border', className)}>
      <div className="overflow-x-auto">
        <table ref={tableRef} className="erp-table w-full border-collapse">
          <thead>
            <tr
              className="bg-muted/50"
              style={{ display: 'grid', gridTemplateColumns }}
            >
              <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left',
                    (col.type === 'currency' || col.type === 'number') &&
                      !col.align &&
                      'text-right'
                  )}
                >
                  {col.header}
                  {col.required && (
                    <span className="ml-0.5 text-destructive">*</span>
                  )}
                </th>
              ))}
              <th className="px-1 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="group border-t border-border"
                style={{ display: 'grid', gridTemplateColumns }}
              >
                {/* Row number */}
                <td className="flex h-8 items-center px-2 text-xs text-muted-foreground">
                  {rowIndex + 1}
                </td>

                {/* Data cells */}
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key}
                    className={cn(
                      'flex h-8 items-center',
                      (col.type === 'currency' || col.type === 'number') &&
                        !col.align &&
                        'justify-end'
                    )}
                  >
                    <InlineGridCell
                      column={col}
                      value={row[col.key]}
                      onChange={(val) =>
                        handleCellChange(rowIndex, col.key, val)
                      }
                      onKeyDown={(e) =>
                        handleKeyDown(e, rowIndex, colIndex)
                      }
                      disabled={disabled}
                    />
                  </td>
                ))}

                {/* Remove button */}
                <td className="flex h-8 items-center justify-center">
                  {onRemoveRow && (
                    <button
                      type="button"
                      onClick={() => onRemoveRow(rowIndex)}
                      disabled={disabled || !canRemoveRow}
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100',
                        'group-hover:opacity-100',
                        (disabled || !canRemoveRow) &&
                          'pointer-events-none opacity-0'
                      )}
                      aria-label={`Remove row ${rowIndex + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Footer */}
          {footer && footer.length > 0 && (
            <tfoot>
              <tr
                className="border-t-2 border-border"
                style={{ display: 'grid', gridTemplateColumns }}
              >
                <td />
                <td
                  colSpan={columns.length}
                  className="px-0 py-0"
                  style={{ gridColumn: `2 / ${columns.length + 2}` }}
                >
                  <div className="flex items-center justify-end gap-6 px-2 py-1.5">
                    {footer.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="font-medium text-muted-foreground">
                          {item.label}:
                        </span>
                        <span
                          className={cn(
                            'font-bold font-mono',
                            item.variant === 'danger' && 'text-destructive',
                            item.variant === 'success' &&
                              'text-green-600 dark:text-green-400',
                            !item.variant || item.variant === 'default'
                              ? 'text-foreground'
                              : ''
                          )}
                        >
                          {typeof item.value === 'number'
                            ? new Intl.NumberFormat('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(item.value)
                            : item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add row button */}
      <button
        type="button"
        onClick={onAddRow}
        disabled={disabled || !canAddRow}
        className={cn(
          'flex w-full items-center justify-center gap-1.5 border-t border-dashed border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
          (disabled || !canAddRow) && 'pointer-events-none opacity-50'
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        {addRowLabel}
      </button>
    </div>
  );
}

// Individual cell renderer
interface InlineGridCellProps<T> {
  column: InlineGridColumn<T>;
  value: unknown;
  onChange: (value: unknown) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
}

function InlineGridCell<T>({
  column,
  value,
  onChange,
  onKeyDown,
  disabled,
}: InlineGridCellProps<T>) {
  const isReadOnly = column.type === 'readonly' || column.readOnly;

  if (isReadOnly) {
    return (
      <span
        className={cn(
          'w-full truncate px-2 text-sm text-muted-foreground',
          (column.type === 'currency' || column.type === 'number') &&
            'font-mono text-right',
          column.align === 'right' && 'text-right',
          column.align === 'center' && 'text-center'
        )}
      >
        {value != null ? String(value) : ''}
      </span>
    );
  }

  if (column.type === 'select') {
    return (
      <Select
        value={value != null ? String(value) : ''}
        onValueChange={(val) => onChange(val)}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-7 w-full rounded-none border-0 bg-transparent px-2 text-sm shadow-none ring-0 focus:ring-1 focus:ring-ring"
          onKeyDown={onKeyDown}
        >
          <SelectValue placeholder={column.placeholder ?? 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {column.options?.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (column.type === 'currency') {
    const numValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? parseFloat(value) || 0
          : 0;

    return (
      <CurrencyInput
        value={numValue}
        onChange={(val) => onChange(val)}
        currency={column.currency}
        disabled={disabled}
        placeholder={column.placeholder ?? '0.00'}
        className="w-full [&_input]:h-7 [&_input]:rounded-none [&_input]:border-0 [&_input]:shadow-none [&_input]:ring-0 [&_input]:focus-visible:ring-1 [&_input]:focus-visible:ring-ring"
      />
    );
  }

  // text or number
  return (
    <Input
      type={column.type === 'number' ? 'number' : 'text'}
      value={value != null ? String(value) : ''}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(column.type === 'number' ? (raw === '' ? 0 : parseFloat(raw)) : raw);
      }}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={column.placeholder}
      className={cn(
        'h-7 w-full rounded-none border-0 bg-transparent px-2 text-sm shadow-none ring-0 focus-visible:ring-1 focus-visible:ring-ring',
        column.type === 'number' && 'text-right font-mono',
        column.align === 'right' && 'text-right',
        column.align === 'center' && 'text-center'
      )}
      step={column.type === 'number' ? '0.01' : undefined}
    />
  );
}

InlineGrid.displayName = 'InlineGrid';
