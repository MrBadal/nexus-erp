'use client';

import { cn } from '@/lib/utils';

const statusColors = {
  success: 'status-dot-success',
  warning: 'status-dot-warning',
  danger: 'status-dot-danger',
  info: 'status-dot-info',
  default: 'status-dot-default',
  muted: 'status-dot-muted',
} as const;

type StatusVariant = keyof typeof statusColors;

interface StatusDotProps {
  status: StatusVariant;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusDot({ status, label, size = 'md', className }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <span
        className={cn(
          'status-dot',
          statusColors[status],
          size === 'sm' && 'w-1.5 h-1.5'
        )}
      />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}
