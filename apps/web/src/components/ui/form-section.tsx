'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  columns?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}

export function FormSection({
  title, description, collapsible = true, defaultOpen = true,
  columns = 2, className, children,
}: FormSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const gridClass = columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3';

  return (
    <div className={cn('border rounded-lg bg-card', className)}>
      <button
        type="button"
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-4 py-2.5 text-left',
          'text-sm font-semibold text-foreground',
          collapsible && 'cursor-pointer hover:bg-muted/50',
          !collapsible && 'cursor-default'
        )}
      >
        <div>
          <span>{title}</span>
          {description && <p className="text-xs font-normal text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {collapsible && (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
      </button>
      {isOpen && (
        <div className={cn('px-4 pb-4 pt-2 grid gap-4', gridClass)}>
          {children}
        </div>
      )}
    </div>
  );
}
