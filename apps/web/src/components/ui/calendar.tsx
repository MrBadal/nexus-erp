'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = React.useState(
    selected?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState(
    selected?.getMonth() ?? today.getMonth()
  );

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return (
    <div className={cn('p-3', className)}>
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={prevMonth}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={nextMonth}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }
          const date = new Date(viewYear, viewMonth, day);
          const isSelected = selected ? isSameDay(date, selected) : false;
          const isToday = isSameDay(date, today);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect?.(date)}
              className={cn(
                'h-8 w-8 mx-auto text-sm rounded-md transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                !isSelected && isToday && 'bg-accent text-accent-foreground',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
