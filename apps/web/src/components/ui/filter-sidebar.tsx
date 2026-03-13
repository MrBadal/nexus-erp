'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronDown, ChevronRight, Filter, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { DatePicker } from './date-picker';
import { Input } from './input';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Separator } from './separator';

// ---------------------------------------------------------------------------
// Filter type definitions
// ---------------------------------------------------------------------------

interface CheckboxGroupFilter {
  key: string;
  label: string;
  type: 'checkbox-group';
  options: { label: string; value: string; count?: number }[];
}

interface DateRangeFilter {
  key: string;
  label: string;
  type: 'date-range';
}

interface SelectFilter {
  key: string;
  label: string;
  type: 'select';
  options: { label: string; value: string }[];
}

interface SearchFilter {
  key: string;
  label: string;
  type: 'search';
  placeholder?: string;
}

type FilterConfig =
  | CheckboxGroupFilter
  | DateRangeFilter
  | SelectFilter
  | SearchFilter;

interface DateRangeValue {
  from?: string;
  to?: string;
}

interface FilterSidebarProps {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onClear: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countActiveFilters(
  filters: FilterConfig[],
  values: Record<string, unknown>,
): number {
  let count = 0;
  for (const filter of filters) {
    const val = values[filter.key];
    if (val === undefined || val === null || val === '') continue;

    switch (filter.type) {
      case 'checkbox-group': {
        const arr = val as string[];
        if (arr.length > 0) count++;
        break;
      }
      case 'date-range': {
        const range = val as DateRangeValue;
        if (range.from || range.to) count++;
        break;
      }
      case 'select': {
        if (typeof val === 'string' && val.length > 0) count++;
        break;
      }
      case 'search': {
        if (typeof val === 'string' && val.length > 0) count++;
        break;
      }
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// CollapsibleSection – lightweight, no extra dependency
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[13px] font-medium text-foreground hover:text-foreground/80 transition-colors"
      >
        <span>{title}</span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual filter renderers
// ---------------------------------------------------------------------------

function CheckboxGroupRenderer({
  filter,
  value,
  onChange,
}: {
  filter: CheckboxGroupFilter;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(next);
  };

  return (
    <>
      {filter.options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 cursor-pointer text-[13px] py-0.5"
        >
          <Checkbox
            checked={value.includes(opt.value)}
            onCheckedChange={() => toggle(opt.value)}
            className="h-3.5 w-3.5"
          />
          <span className="flex-1 truncate text-foreground/90">
            {opt.label}
          </span>
          {opt.count !== undefined && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              ({opt.count})
            </span>
          )}
        </label>
      ))}
    </>
  );
}

function DateRangeRenderer({
  value,
  onChange,
}: {
  filter: DateRangeFilter;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label className="text-[11px] text-muted-foreground">From</Label>
        <DatePicker
          value={value.from ? new Date(value.from) : undefined}
          onChange={(date) =>
            onChange({ ...value, from: date.toISOString().split('T')[0] })
          }
          placeholder="Start date"
          className="h-8 text-[13px]"
        />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">To</Label>
        <DatePicker
          value={value.to ? new Date(value.to) : undefined}
          onChange={(date) =>
            onChange({ ...value, to: date.toISOString().split('T')[0] })
          }
          placeholder="End date"
          className="h-8 text-[13px]"
        />
      </div>
    </div>
  );
}

function SelectRenderer({
  filter,
  value,
  onChange,
}: {
  filter: SelectFilter;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-[13px]">
        <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {filter.options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SearchRenderer({
  filter,
  value,
  onChange,
}: {
  filter: SearchFilter;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={filter.placeholder ?? `Search ${filter.label.toLowerCase()}...`}
        className="h-8 pl-7 text-[13px]"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterRenderer – routes to the correct renderer
// ---------------------------------------------------------------------------

function FilterRenderer({
  filter,
  values,
  onChange,
}: {
  filter: FilterConfig;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  switch (filter.type) {
    case 'checkbox-group':
      return (
        <CheckboxGroupRenderer
          filter={filter}
          value={(values[filter.key] as string[] | undefined) ?? []}
          onChange={(v) => onChange(filter.key, v)}
        />
      );
    case 'date-range':
      return (
        <DateRangeRenderer
          filter={filter}
          value={(values[filter.key] as DateRangeValue | undefined) ?? {}}
          onChange={(v) => onChange(filter.key, v)}
        />
      );
    case 'select':
      return (
        <SelectRenderer
          filter={filter}
          value={(values[filter.key] as string | undefined) ?? ''}
          onChange={(v) => onChange(filter.key, v)}
        />
      );
    case 'search':
      return (
        <SearchRenderer
          filter={filter}
          value={(values[filter.key] as string | undefined) ?? ''}
          onChange={(v) => onChange(filter.key, v)}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// FilterSidebarContent – shared between desktop and mobile views
// ---------------------------------------------------------------------------

function FilterSidebarContent({
  filters,
  values,
  onChange,
  onClear,
}: Omit<FilterSidebarProps, 'className'>) {
  const activeCount = countActiveFilters(filters, values);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[13px] font-semibold">Filters</span>
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 justify-center px-1.5 text-[11px]"
            >
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="link"
            size="sm"
            onClick={onClear}
            className="h-auto p-0 text-[12px] text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      <Separator />

      {/* Filter sections */}
      <div className="flex-1 overflow-y-auto px-3">
        {filters.map((filter, idx) => (
          <React.Fragment key={filter.key}>
            <CollapsibleSection title={filter.label}>
              <FilterRenderer
                filter={filter}
                values={values}
                onChange={onChange}
              />
            </CollapsibleSection>
            {idx < filters.length - 1 && <Separator />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterSidebar – main export
// ---------------------------------------------------------------------------

export function FilterSidebar({
  filters,
  values,
  onChange,
  onClear,
  className,
}: FilterSidebarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const activeCount = countActiveFilters(filters, values);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex md:w-[240px] md:shrink-0 md:flex-col border-r border-border bg-background',
          className,
        )}
      >
        <FilterSidebarContent
          filters={filters}
          values={values}
          onChange={onChange}
          onClear={onClear}
        />
      </aside>

      {/* Mobile trigger + sheet */}
      <div className="md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(true)}
          className="gap-1.5 text-[13px]"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 justify-center px-1.5 text-[11px]"
            >
              {activeCount}
            </Badge>
          )}
        </Button>

        <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[280px] bg-background shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300">
              <DialogPrimitive.Title className="sr-only">
                Filters
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Filter options for the list
              </DialogPrimitive.Description>
              <div className="absolute right-2 top-2 z-10">
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogPrimitive.Close>
              </div>
              <FilterSidebarContent
                filters={filters}
                values={values}
                onChange={onChange}
                onClear={onClear}
              />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Re-export types for consumers
// ---------------------------------------------------------------------------

export type {
  FilterConfig,
  FilterSidebarProps,
  CheckboxGroupFilter,
  DateRangeFilter,
  SelectFilter,
  SearchFilter,
  DateRangeValue,
};
