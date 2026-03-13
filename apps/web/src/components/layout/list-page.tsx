'use client';

import Link from 'next/link';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FilterSidebar,
  type FilterConfig,
} from '@/components/ui/filter-sidebar';
import { PageHeader } from './page-header';

interface SummaryCard {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon?: React.ReactNode;
}

interface ListPageProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  createButton?: { label: string; href: string };
  toolbarActions?: React.ReactNode;
  summaryCards?: SummaryCard[];
  filterConfig?: FilterConfig[];
  filterValues?: Record<string, unknown>;
  onFilterChange?: (key: string, value: unknown) => void;
  onFilterClear?: () => void;
  children: React.ReactNode;
}

function SummaryCardItem({ card }: { card: SummaryCard }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">{card.label}</span>
          {card.icon && (
            <span className="text-muted-foreground">{card.icon}</span>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">
            {card.value}
          </span>
          {card.change && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                card.trend === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : card.trend === 'down'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground',
              )}
            >
              {card.trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {card.trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {card.change}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ListPage({
  title,
  subtitle,
  breadcrumbs,
  createButton,
  toolbarActions,
  summaryCards,
  filterConfig,
  filterValues,
  onFilterChange,
  onFilterClear,
  children,
}: ListPageProps) {
  const hasFilters =
    filterConfig &&
    filterConfig.length > 0 &&
    onFilterChange &&
    onFilterClear;

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            {toolbarActions}
            {createButton && (
              <Button asChild size="sm">
                <Link href={createButton.href}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {createButton.label}
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Summary KPI cards */}
      {summaryCards && summaryCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 px-6 py-4 md:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCardItem key={card.label} card={card} />
          ))}
        </div>
      )}

      {/* Main content area: filter sidebar + table */}
      <div className="flex flex-1 overflow-hidden">
        {hasFilters && (
          <FilterSidebar
            filters={filterConfig}
            values={filterValues ?? {}}
            onChange={onFilterChange}
            onClear={onFilterClear}
          />
        )}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export type { ListPageProps, SummaryCard };
