'use client';

import { useRouter } from 'next/navigation';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgChart, type OrgChartNode } from '@/hooks/use-asset-assignment';
import { cn } from '@/lib/utils';

// ─── Recursive node component ───────────────────────────────────────────────

function OrgNode({
  node,
  depth,
  onSelect,
}: {
  node: OrgChartNode;
  depth: number;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = (node.children?.length ?? 0) > 0;

  const initials = `${(node.firstName ?? '').charAt(0)}${(node.lastName ?? '').charAt(0)}`.toUpperCase();

  return (
    <div className="flex flex-col">
      <div className="flex items-stretch gap-2">
        {hasChildren ? (
          <button
            type="button"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            'group flex flex-1 items-center gap-3 rounded-lg border bg-card p-3 text-left shadow-sm transition-all hover:border-primary/50 hover:bg-muted/40',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {node.firstName} {node.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {node.designation || node.email}
            </p>
          </div>
          {hasChildren && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {node.children.length}
            </span>
          )}
        </button>
      </div>

      {hasChildren && !collapsed && (
        <div
          className="ml-3 mt-2 space-y-2 border-l-2 border-dashed border-border pl-4"
          style={{ marginLeft: depth === 0 ? '0.75rem' : '0.75rem' }}
        >
          {node.children.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const router = useRouter();
  const { data, isLoading, error } = useOrgChart();
  const roots = data ?? [];

  const handleSelect = (id: string) => {
    router.push(`/hr/employees/${id}`);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Organisation Chart"
        subtitle="Reporting structure built from manager relationships"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Org Chart' },
        ]}
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full max-w-xl" />
            <Skeleton className="h-16 w-full max-w-md ml-8" />
            <Skeleton className="h-16 w-full max-w-md ml-8" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Failed to load org chart.
          </p>
        ) : roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No employees found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add employees and assign managers to build your org chart.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            {roots.map((root) => (
              <OrgNode
                key={root.id}
                node={root}
                depth={0}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
