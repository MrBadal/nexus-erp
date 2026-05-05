'use client';

import { useMemo, useState } from 'react';
import { Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  type Holiday,
  type HolidayType,
  type CreateHolidayInput,
} from '@/hooks/use-holidays';
import { formatDate } from '@/lib/utils';

// 28 states + 8 union territories (2-letter codes per ISO 3166-2:IN)
const INDIAN_STATE_OPTIONS: { code: string; name: string }[] = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'CG', name: 'Chhattisgarh' },
  { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OD', name: 'Odisha' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
];

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

function emptyForm(year: number): CreateHolidayInput {
  return {
    date: `${year}-01-01`,
    name: '',
    type: 'company',
    regions: [],
    isRecurring: false,
    notes: '',
  };
}

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CreateHolidayInput>(emptyForm(currentYear));
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionsOpen, setRegionsOpen] = useState(false);

  const { data: holidays, isLoading } = useHolidays({ year });
  const createMutation = useCreateHoliday();
  const deleteMutation = useDeleteHoliday();

  const yearOptions = useMemo(() => {
    const opts: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 3; y += 1) opts.push(y);
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

  const handleOpenCreate = () => {
    setForm(emptyForm(year));
    setSelectedRegions([]);
    setRegionsOpen(false);
    setDialogOpen(true);
  };

  const toggleRegion = (code: string) => {
    setSelectedRegions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.date) {
      toast.error('Name and date are required');
      return;
    }
    if (form.type === 'state' && selectedRegions.length === 0) {
      toast.error('At least one state is required for state-level holidays');
      return;
    }
    const payload: CreateHolidayInput = {
      date: form.date,
      name: form.name.trim(),
      type: form.type,
      regions: selectedRegions.length > 0 ? selectedRegions : undefined,
      isRecurring: form.isRecurring,
      year: new Date(form.date).getUTCFullYear(),
      notes: form.notes?.trim() || undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Holiday created');
        setDialogOpen(false);
      },
      onError: () => toast.error('Failed to create holiday'),
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this holiday?')) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Holiday deleted'),
      onError: () => toast.error('Failed to delete holiday'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Holidays</h1>
          <p className="text-sm text-muted-foreground">
            Manage company, national, and regional holidays for the year.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Holiday</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="holiday-name">Name</Label>
                  <Input
                    id="holiday-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Independence Day"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="holiday-date">Date</Label>
                    <Input
                      id="holiday-date"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="holiday-type">Type</Label>
                    <Select
                      value={form.type ?? 'company'}
                      onValueChange={(v) =>
                        setForm({ ...form, type: v as HolidayType })
                      }
                    >
                      <SelectTrigger id="holiday-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="state">State</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="holiday-regions">
                    States / UTs {form.type === 'state' && <span className="text-destructive">*</span>}
                  </Label>
                  <button
                    type="button"
                    id="holiday-regions"
                    onClick={() => setRegionsOpen((o) => !o)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm text-left hover:bg-accent"
                  >
                    <span className="truncate">
                      {selectedRegions.length === 0
                        ? 'Select states/UTs (leave empty for all-India)'
                        : `${selectedRegions.length} selected: ${selectedRegions.join(', ')}`}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {regionsOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {regionsOpen && (
                    <div className="max-h-48 overflow-y-auto rounded-md border bg-popover p-2 text-sm shadow-sm">
                      {INDIAN_STATE_OPTIONS.map((s) => (
                        <label
                          key={s.code}
                          className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-input"
                            checked={selectedRegions.includes(s.code)}
                            onChange={() => toggleRegion(s.code)}
                          />
                          <span className="font-mono text-xs">{s.code}</span>
                          <span className="text-xs text-muted-foreground">{s.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="holiday-recurring"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={!!form.isRecurring}
                    onChange={(e) =>
                      setForm({ ...form, isRecurring: e.target.checked })
                    }
                  />
                  <Label htmlFor="holiday-recurring" className="font-normal">
                    Recurs every year
                  </Label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="holiday-notes">Notes</Label>
                  <Textarea
                    id="holiday-notes"
                    value={form.notes ?? ''}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving…' : 'Create Holiday'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                            {h.isRecurring && <span>· Recurring</span>}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(h.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
