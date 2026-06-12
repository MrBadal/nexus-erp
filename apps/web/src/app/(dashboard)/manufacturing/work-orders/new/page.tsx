'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateWorkOrder,
  useBoms,
  useWorkstations,
} from '@/hooks/use-manufacturing';

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams (must be inside Suspense)
// ---------------------------------------------------------------------------

function NewWorkOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createMutation = useCreateWorkOrder();

  const { data: bomsData } = useBoms();
  const { data: workstationsData } = useWorkstations();

  const bomsList = (bomsData as { id: string; bomNumber?: string; itemName?: string }[] | undefined) ?? [];
  const workstationsList = (workstationsData as { id: string; name: string }[] | undefined) ?? [];

  const prefillBomId = searchParams.get('bomId') ?? '';

  const [bomId, setBomId] = useState(prefillBomId);
  const [plannedQty, setPlannedQty] = useState('1');
  const [plannedStartDate, setPlannedStartDate] = useState<Date | null>(null);
  const [plannedEndDate, setPlannedEndDate] = useState<Date | null>(null);
  const [workstationId, setWorkstationId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (prefillBomId) {
      setBomId(prefillBomId);
    }
  }, [prefillBomId]);

  function handleSubmit() {
    if (!plannedQty || parseFloat(plannedQty) <= 0) {
      toast.error('Planned quantity must be greater than 0');
      return;
    }
    createMutation.mutate(
      {
        bomId: bomId || undefined,
        plannedQty: parseFloat(plannedQty),
        plannedStartDate: plannedStartDate?.toISOString().split('T')[0],
        plannedEndDate: plannedEndDate?.toISOString().split('T')[0],
        workstationId: workstationId || undefined,
        notes,
      },
      {
        onSuccess: (data) => {
          toast.success('Work order created');
          const id = (data as { id?: string }).id;
          router.push(id ? `/manufacturing/work-orders/${id}` : '/manufacturing/work-orders');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create work order')),
      },
    );
  }

  return (
    <FormPage
      title="New Work Order"
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Work Orders', href: '/manufacturing/work-orders' },
        { label: 'New Work Order' },
      ]}
      backHref="/manufacturing/work-orders"
      primaryAction={{
        label: 'Create Work Order',
        onClick: handleSubmit,
        loading: createMutation.isPending,
      }}
    >
      <div className="space-y-6">
        <FormSection title="Work Order Details" columns={2}>
          <FormField label="BOM">
            <Select value={bomId} onValueChange={(v) => setBomId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select BOM (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {bomsList.map((bom) => (
                  <SelectItem key={bom.id} value={bom.id}>
                    {bom.bomNumber ?? bom.id}{bom.itemName ? ` — ${bom.itemName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Planned Quantity" required>
            <Input
              type="number"
              value={plannedQty ?? undefined}
              onChange={(e) => setPlannedQty(e.target.value)}
              min={0}
              step={0.001}
            />
          </FormField>
          <FormField label="Planned Start Date">
            <DatePicker
              value={plannedStartDate ?? undefined}
              onChange={(d) => setPlannedStartDate(d)}
            />
          </FormField>
          <FormField label="Planned End Date">
            <DatePicker
              value={plannedEndDate ?? undefined}
              onChange={(d) => setPlannedEndDate(d)}
            />
          </FormField>
          <FormField label="Workstation">
            <Select value={workstationId} onValueChange={(v) => setWorkstationId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select workstation (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {workstationsList.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={notes ?? undefined}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes"
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}

// ---------------------------------------------------------------------------
// Page export — wraps inner component in Suspense for useSearchParams
// ---------------------------------------------------------------------------

export default function NewWorkOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <NewWorkOrderForm />
    </Suspense>
  );
}
