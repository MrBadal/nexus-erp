'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateWorkstation } from '@/hooks/use-manufacturing';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkstationType = 'machine' | 'labor' | 'equipment';

const workstationTypeOptions: { value: WorkstationType; label: string }[] = [
  { value: 'machine', label: 'Machine' },
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewWorkstationPage() {
  const router = useRouter();
  const createMutation = useCreateWorkstation();

  const [name, setName] = useState('');
  const [workstationType, setWorkstationType] = useState<WorkstationType>('machine');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [capacityUnit, setCapacityUnit] = useState('');
  const [operatingCost, setOperatingCost] = useState('');

  function handleSubmit() {
    if (!name.trim()) {
      toast.error('Workstation name is required');
      return;
    }
    createMutation.mutate(
      {
        name: name.trim(),
        workstationType,
        description,
        capacity: capacity ? parseFloat(capacity) : undefined,
        capacityUnit: capacityUnit || undefined,
        operatingCost: operatingCost ? parseFloat(operatingCost) : undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('Workstation created');
          const id = (data as { id?: string }).id;
          router.push(id ? `/manufacturing/workstations/${id}` : '/manufacturing/workstations');
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create workstation')),
      },
    );
  }

  return (
    <FormPage
      title="New Workstation"
      breadcrumbs={[
        { label: 'Manufacturing', href: '/manufacturing' },
        { label: 'Workstations', href: '/manufacturing/workstations' },
        { label: 'New Workstation' },
      ]}
      backHref="/manufacturing/workstations"
      primaryAction={{
        label: 'Create Workstation',
        onClick: handleSubmit,
        loading: createMutation.isPending,
      }}
    >
      <div className="space-y-6">
        <FormSection title="Workstation Details" columns={2}>
          <FormField label="Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CNC Machine Center A"
            />
          </FormField>
          <FormField label="Type">
            <Select
              value={workstationType}
              onValueChange={(v) => setWorkstationType(v as WorkstationType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workstationTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Capacity">
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g., 100"
              min={0}
            />
          </FormField>
          <FormField label="Capacity Unit">
            <Input
              value={capacityUnit}
              onChange={(e) => setCapacityUnit(e.target.value)}
              placeholder="e.g., units/hour, kg/day"
            />
          </FormField>
          <FormField label="Operating Cost (per hour)">
            <Input
              type="number"
              value={operatingCost}
              onChange={(e) => setOperatingCost(e.target.value)}
              placeholder="e.g., 85.00"
              min={0}
              step={0.01}
            />
          </FormField>
          <FormField label="Description" className="col-span-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this workstation"
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
