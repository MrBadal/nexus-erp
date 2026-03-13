'use client';

import { cn } from '@/lib/utils';
import { Label } from './label';

interface FormFieldProps {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, description, required, className, children }: FormFieldProps) {
  return (
    <div className={cn('erp-field space-y-1', className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {description && !error && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
