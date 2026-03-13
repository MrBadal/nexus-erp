'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-dot';

interface ActionBarProps {
  backHref?: string;
  breadcrumbs?: { label: string; href?: string }[];
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted';
  };
  primaryAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryActions?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
    disabled?: boolean;
  }[];
  dangerAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export function ActionBar({
  backHref,
  breadcrumbs,
  status,
  primaryAction,
  secondaryActions,
  dangerAction,
}: ActionBarProps) {
  return (
    <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-background px-4">
      {/* Left side: back arrow + breadcrumbs + status */}
      <div className="flex items-center gap-2">
        {backHref && (
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Go back</span>
            </Link>
          </Button>
        )}

        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="inline-flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {status && (
          <StatusDot
            status={status.variant}
            label={status.label}
            size="sm"
            className="ml-2"
          />
        )}
      </div>

      {/* Right side: danger + secondary + primary actions */}
      <div className="flex items-center gap-2">
        {dangerAction && (
          <Button
            variant="outline"
            size="sm"
            disabled={dangerAction.disabled}
            onClick={dangerAction.onClick}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {dangerAction.label}
          </Button>
        )}

        {secondaryActions?.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? 'outline'}
            size="sm"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}

        {primaryAction && (
          <Button
            size="sm"
            disabled={primaryAction.disabled || primaryAction.loading}
            onClick={primaryAction.onClick}
          >
            {primaryAction.loading && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export type { ActionBarProps };
