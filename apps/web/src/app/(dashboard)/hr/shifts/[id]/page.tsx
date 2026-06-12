'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  useShift,
  useUpdateShift,
  useShiftAssignments,
  useAssignShift,
  useDeactivateShiftAssignment,
} from '@/hooks/use-shifts';
import { useEmployees, type Employee } from '@/hooks/use-hr';
import { apiErrorMessage } from '@/lib/api';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShiftDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const shiftId = params.id;

  const { data: shift, isLoading } = useShift(shiftId);
  const updateMutation = useUpdateShift();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [weekendDays, setWeekendDays] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (shift) {
      setName(shift.name);
      setCode(shift.code);
      setStartTime(shift.startTime.slice(0, 5));
      setEndTime(shift.endTime.slice(0, 5));
      setBreakMinutes(shift.breakMinutes);
      setWeekendDays(shift.weekendDays ?? []);
      setIsActive(shift.isActive);
    }
  }, [shift]);

  const handleSave = () => {
    if (!shiftId) return;
    updateMutation.mutate(
      {
        id: shiftId,
        data: {
          name,
          code,
          startTime,
          endTime,
          breakMinutes,
          weekendDays,
          isActive,
        },
      },
      {
        onSuccess: () => toast.success('Shift updated'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to update shift')),
      },
    );
  };

  const toggleWeekendDay = (day: number) => {
    setWeekendDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!shift) {
    return <div className="p-6 text-sm text-muted-foreground">Shift not found.</div>;
  }

  return (
    <FormPage
      title={shift.name}
      subtitle={`Code: ${shift.code}`}
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Shifts', href: '/hr/shifts' },
        { label: shift.name },
      ]}
      status={{
        label: shift.isActive ? 'Active' : 'Inactive',
        variant: shift.isActive ? 'success' : 'muted',
      }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      backHref="/hr/shifts"
    >
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <FormSection title="Shift Details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Code">
                <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} />
              </FormField>
              <FormField label="Start Time">
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </FormField>
              <FormField label="End Time">
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </FormField>
              <FormField label="Break (minutes)">
                <Input
                  type="number"
                  min={0}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                />
              </FormField>
              <FormField label="Active">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </FormField>
            </div>
            <div className="mt-4">
              <Label className="text-sm">Weekend Days</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {DAY_LABELS.map((label, idx) => (
                  <label key={idx} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={weekendDays.includes(idx)}
                      onCheckedChange={() => toggleWeekendDay(idx)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </FormSection>
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab shiftId={shiftId} />
        </TabsContent>
      </Tabs>
    </FormPage>
  );
}

function AssignmentsTab({ shiftId }: { shiftId: string }) {
  const { data: assignments, isLoading } = useShiftAssignments({ shiftId });
  const { data: employees } = useEmployees();
  const assignMutation = useAssignShift();
  const deactivateMutation = useDeactivateShiftAssignment();

  const [employeeId, setEmployeeId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [effectiveTo, setEffectiveTo] = useState('');

  const handleAssign = () => {
    if (!employeeId || !effectiveFrom) {
      toast.error('Employee and effective from date are required');
      return;
    }
    assignMutation.mutate(
      {
        employeeId,
        shiftId,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Employee assigned');
          setEmployeeId('');
          setEffectiveTo('');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to assign')),
      },
    );
  };

  const handleDeactivate = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    deactivateMutation.mutate(
      { id, effectiveTo: today },
      {
        onSuccess: () => toast.success('Assignment deactivated'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to deactivate')),
      },
    );
  };

  const employeeList: Employee[] = employees ?? [];

  return (
    <div className="space-y-4">
      <FormSection title="Assign Employee">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="grid gap-1.5 md:col-span-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employeeList.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Effective From</Label>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Effective To (optional)</Label>
            <Input
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={handleAssign} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Assigning...' : 'Assign'}
          </Button>
        </div>
      </FormSection>

      <FormSection title="Current & Past Assignments">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !assignments || assignments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No assignments yet.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const isActive = !a.effectiveTo;
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-2">
                        {a.employeeFirstName} {a.employeeLastName}{' '}
                        <span className="text-xs text-muted-foreground">
                          ({a.employeeCode})
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{a.effectiveFrom}</td>
                      <td className="px-3 py-2 tabular-nums">{a.effectiveTo ?? '-'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            isActive
                              ? 'text-emerald-600'
                              : 'text-muted-foreground'
                          }
                        >
                          {isActive ? 'Active' : 'Ended'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(a.id)}
                            disabled={deactivateMutation.isPending}
                          >
                            Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>
    </div>
  );
}
