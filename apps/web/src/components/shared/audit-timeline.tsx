'use client';

import { useAuditLog, type AuditLogEntry } from '@/hooks/use-audit';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  Plus,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AuditTimelineProps {
  entityType: string;
  entityId: string;
}

const actionIcons: Record<string, React.ElementType> = {
  created: Plus,
  create: Plus,
  updated: Edit,
  update: Edit,
  deleted: Trash2,
  delete: Trash2,
  approved: CheckCircle,
  approve: CheckCircle,
  confirmed: CheckCircle,
  confirm: CheckCircle,
  rejected: XCircle,
  reject: XCircle,
  voided: XCircle,
  void: XCircle,
  cancelled: XCircle,
  cancel: XCircle,
  sent: Send,
  send: Send,
  posted: FileText,
  post: FileText,
  reversed: RotateCcw,
  reverse: RotateCcw,
};

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(dateStr);
}

function formatChanges(changes: Record<string, unknown> | null): string | null {
  if (!changes || Object.keys(changes).length === 0) return null;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(changes)) {
    const formattedKey = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    if (value && typeof value === 'object' && 'from' in (value as Record<string, unknown>) && 'to' in (value as Record<string, unknown>)) {
      const change = value as { from: unknown; to: unknown };
      parts.push(`${formattedKey}: ${String(change.from)} -> ${String(change.to)}`);
    } else {
      parts.push(`${formattedKey}: ${String(value)}`);
    }
  }
  return parts.join(', ');
}

export function AuditTimeline({ entityType, entityId }: AuditTimelineProps) {
  const { data, isLoading } = useAuditLog({ entityType, entityId });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const entries = Array.isArray(data) ? data : [];

  if (entries.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">No activity recorded yet.</p>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {entries.map((entry: AuditLogEntry) => {
        const Icon = actionIcons[entry.action.toLowerCase()] ?? Activity;
        const changesSummary = formatChanges(entry.changes);

        return (
          <div key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium">
                {entry.action.charAt(0).toUpperCase() + entry.action.slice(1).replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-muted-foreground">
                {getRelativeTime(entry.createdAt)} &middot; {formatDate(entry.createdAt)}
              </p>
              {changesSummary && (
                <p className="mt-1 text-xs text-muted-foreground truncate max-w-md">
                  {changesSummary}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
