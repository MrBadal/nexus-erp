import {
  Plus,
  Pencil,
  Check,
  RotateCcw,
  DollarSign,
  Send,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type:
    | 'created'
    | 'edited'
    | 'posted'
    | 'reversed'
    | 'payment'
    | 'sent'
    | 'voided'
    | 'comment';
  description: string;
  user?: string;
  date: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const eventIcons: Record<TimelineEvent['type'], React.ElementType> = {
  created: Plus,
  edited: Pencil,
  posted: Check,
  reversed: RotateCcw,
  payment: DollarSign,
  sent: Send,
  voided: XCircle,
  comment: MessageSquare,
};

const eventColors: Record<TimelineEvent['type'], string> = {
  created: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
  edited: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
  posted: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
  reversed: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
  payment: 'text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400',
  sent: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
  voided: 'text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400',
  comment: 'text-muted-foreground bg-muted',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function Timeline({ events, className }: TimelineProps) {
  if (events.length === 0) return null;

  // Most recent first
  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className={cn('relative', className)}>
      {/* Vertical connecting line */}
      <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />

      <ul className="space-y-0">
        {sorted.map((event) => {
          const Icon = eventIcons[event.type];
          const colorClasses = eventColors[event.type];

          return (
            <li
              key={event.id}
              className="relative flex items-start gap-3 py-1.5"
              style={{ minHeight: '28px' }}
            >
              {/* Icon */}
              <div
                className={cn(
                  'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                  colorClasses,
                )}
              >
                <Icon className="h-3 w-3" />
              </div>

              {/* Content */}
              <div className="flex flex-1 items-baseline gap-1.5 min-w-0 pt-0.5">
                <span className="text-[13px] text-foreground truncate">
                  {event.description}
                </span>
                {event.user && (
                  <span className="text-[12px] text-muted-foreground shrink-0">
                    by {event.user}
                  </span>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {formatRelativeTime(event.date)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type { TimelineEvent, TimelineProps };
