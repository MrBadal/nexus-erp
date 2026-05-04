'use client';

import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useEssHolidays,
  type Holiday,
  type HolidayType,
} from '@/hooks/use-holidays';
import { formatDate } from '@/lib/utils';

const typeLabels: Record<HolidayType, string> = {
  national: 'National',
  state: 'State',
  company: 'Company',
  restricted: 'Restricted',
};

const typeBadge: Record<HolidayType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  national: 'default',
  state: 'secondary',
  company: 'outline',
  restricted: 'destructive',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EssHolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const { data: holidays, isLoading } = useEssHolidays({ year });

  const yearOptions = useMemo(() => {
    const opts: number[] = [];
    for (let y = currentYear - 1; y <= currentYear + 2; y += 1) opts.push(y);
    return opts;
  }, [currentYear]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    (holidays ?? []).forEach((h) => {
      const key = h.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    });
    return map;
  }, [holidays]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Holiday Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Public and company holidays for the year.
          </p>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')}>
        <TabsList>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {MONTHS.map((monthName, monthIdx) => (
                <MonthCard
                  key={monthIdx}
                  year={year}
                  month={monthIdx}
                  monthName={monthName}
                  holidaysByDate={holidaysByDate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Holidays for {year}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : !holidays || holidays.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No holidays configured for {year}.
                </div>
              ) : (
                <div className="divide-y">
                  {holidays.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-24 font-mono text-sm">
                          {formatDate(h.date)}
                        </div>
                        <div>
                          <div className="font-medium">{h.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={typeBadge[h.type]}>
                              {typeLabels[h.type]}
                            </Badge>
                            {h.regions && h.regions.length > 0 && (
                              <span>Regions: {h.regions.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MonthCard({
  year,
  month,
  monthName,
  holidaysByDate,
}: {
  year: number;
  month: number;
  monthName: string;
  holidaysByDate: Map<string, Holiday[]>;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{monthName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
          {WEEK_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} className="h-8" />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const todays = holidaysByDate.get(dateStr) ?? [];
            const isHoliday = todays.length > 0;
            return (
              <div
                key={idx}
                title={todays.map((h) => h.name).join(', ')}
                className={`flex h-8 items-center justify-center rounded text-xs ${
                  isHoliday
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-foreground'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
