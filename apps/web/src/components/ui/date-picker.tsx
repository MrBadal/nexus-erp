'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const formatted = value
    ? value.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-10',
            !value && 'text-muted-foreground',
            className
          )}
          type="button"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatted ?? <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
