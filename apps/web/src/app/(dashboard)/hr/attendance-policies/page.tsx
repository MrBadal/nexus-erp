'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ListPage } from '@/components/layout/list-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-dot';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAttendancePolicies,
  useActiveAttendancePolicy,
  useCreateAttendancePolicy,
  useUpdateAttendancePolicy,
  useDeleteAttendancePolicy,
  type AttendancePolicy,
} from '@/hooks/use-attendance-policies';

export default function AttendancePoliciesPage() {
  const { data: policies, isLoading } = useAttendancePolicies();
  const { data: active } = useActiveAttendancePolicy();
  const createMutation = useCreateAttendancePolicy();
  const updateMutation = useUpdateAttendancePolicy();
  const deleteMutation = useDeleteAttendancePolicy();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [lateThresholdMinutes, setLateThresholdMinutes] = useState(30);
  const [deductionPerInstance, setDeductionPerInstance] = useState('0');
  const [monthlyToleranceCount, setMonthlyToleranceCount] = useState(3);
  const [isActive, setIsActive] = useState(true);

  // Pre-populate form with the active policy if there is one
  useEffect(() => {
    if (active && !editingId) {
      setEditingId(active.id);
      setName(active.name);
      setGraceMinutes(active.graceMinutes);
      setLateThresholdMinutes(active.lateThresholdMinutes);
      setDeductionPerInstance(active.deductionPerInstance);
      setMonthlyToleranceCount(active.monthlyToleranceCount);
      setIsActive(active.isActive);
    }
  }, [active, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setGraceMinutes(15);
    setLateThresholdMinutes(30);
    setDeductionPerInstance('0');
    setMonthlyToleranceCount(3);
    setIsActive(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Policy name is required');
      return;
    }

    const payload = {
      name,
      graceMinutes,
      lateThresholdMinutes,
      deductionPerInstance,
      monthlyToleranceCount,
      isActive,
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => toast.success('Policy updated'),
          onError: () => toast.error('Failed to update policy'),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Policy created');
          resetForm();
        },
        onError: () => toast.error('Failed to create policy'),
      });
    }
  };

  const handleEdit = (p: AttendancePolicy) => {
    setEditingId(p.id);
    setName(p.name);
    setGraceMinutes(p.graceMinutes);
    setLateThresholdMinutes(p.lateThresholdMinutes);
    setDeductionPerInstance(p.deductionPerInstance);
    setMonthlyToleranceCount(p.monthlyToleranceCount);
    setIsActive(p.isActive);
  };

  const handleDelete = (p: AttendancePolicy, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete attendance policy "${p.name}"?`)) return;
    deleteMutation.mutate(p.id, {
      onSuccess: () => {
        toast.success('Policy deleted');
        if (editingId === p.id) resetForm();
      },
      onError: () => toast.error('Failed to delete policy'),
    });
  };

  const policyList = policies ?? [];

  return (
    <ListPage
      title="Attendance Policy"
      subtitle="Set grace period, late threshold, and deduction rules. Only one policy is active at a time per tenant."
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Attendance Policy' },
      ]}
      summaryCards={[
        { label: 'Total Policies', value: policyList.length },
        { label: 'Active', value: active ? 'Yes' : 'No' },
      ]}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FormSection title={editingId ? 'Edit Policy' : 'Create Policy'}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Default Attendance Policy"
                />
              </FormField>
              <FormField
                label="Grace Minutes"
                description="Minutes after shift start before lateness is recorded"
              >
                <Input
                  type="number"
                  min={0}
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(parseInt(e.target.value) || 0)}
                />
              </FormField>
              <FormField
                label="Late Threshold (minutes)"
                description="Minutes after start considered severely late"
              >
                <Input
                  type="number"
                  min={0}
                  value={lateThresholdMinutes}
                  onChange={(e) =>
                    setLateThresholdMinutes(parseInt(e.target.value) || 0)
                  }
                />
              </FormField>
              <FormField
                label="Deduction per instance"
                description="Amount deducted for each late instance past tolerance"
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={deductionPerInstance}
                  onChange={(e) => setDeductionPerInstance(e.target.value || '0')}
                />
              </FormField>
              <FormField
                label="Monthly Tolerance"
                description="Late instances forgiven each month"
              >
                <Input
                  type="number"
                  min={0}
                  value={monthlyToleranceCount}
                  onChange={(e) =>
                    setMonthlyToleranceCount(parseInt(e.target.value) || 0)
                  }
                />
              </FormField>
              <FormField label="Active">
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-xs text-muted-foreground">
                    Enabling will deactivate any other active policy.
                  </span>
                </div>
              </FormField>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Update Policy' : 'Create Policy'}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  New Policy
                </Button>
              )}
            </div>
          </FormSection>
        </div>

        <div>
          <FormSection title="All Policies">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : policyList.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No policies yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {policyList.map((p) => (
                  <Card
                    key={p.id}
                    className={
                      editingId === p.id
                        ? 'cursor-pointer border-primary/60'
                        : 'cursor-pointer'
                    }
                    onClick={() => handleEdit(p)}
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Grace {p.graceMinutes}m / Tol {p.monthlyToleranceCount}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusDot
                          status={p.isActive ? 'success' : 'muted'}
                          label={p.isActive ? 'Active' : 'Inactive'}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => handleDelete(p, e)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </FormSection>
        </div>
      </div>
    </ListPage>
  );
}
