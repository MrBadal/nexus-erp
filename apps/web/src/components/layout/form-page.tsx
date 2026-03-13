'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ActionBar } from './action-bar';

interface FormPageProps {
  title: string;
  subtitle?: string;
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
  backHref?: string;
  meta?: { label: string; value: React.ReactNode }[];
  children: React.ReactNode;
}

export function FormPage({
  title,
  subtitle,
  breadcrumbs,
  status,
  primaryAction,
  secondaryActions,
  dangerAction,
  backHref,
  meta,
  children,
}: FormPageProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Action bar */}
      <ActionBar
        backHref={backHref}
        breadcrumbs={breadcrumbs}
        status={status}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        dangerAction={dangerAction}
      />

      {/* Title area */}
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Main content + sidebar */}
      <div className="flex flex-1 gap-6 overflow-auto px-6 pb-6">
        {/* Main content area */}
        <main className="min-w-0 flex-[3]">{children}</main>

        {/* Right sidebar with metadata */}
        {meta && meta.length > 0 && (
          <aside className="w-72 shrink-0 lg:w-80">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Details
                </h2>
                <div className="space-y-3">
                  {meta.map((item, index) => (
                    <div key={item.label}>
                      <dt className="text-[12px] font-medium text-muted-foreground">
                        {item.label}
                      </dt>
                      <dd className="mt-0.5 text-sm text-foreground">
                        {item.value}
                      </dd>
                      {index < meta.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}

export type { FormPageProps };
