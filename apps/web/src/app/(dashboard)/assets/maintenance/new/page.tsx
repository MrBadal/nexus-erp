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
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAssetMaintenance } from '@/hooks/use-assets';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const maintenanceTypes = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'predictive', label: 'Predictive' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'inspection', label: 'Inspection' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewMaintenancePage() {
  const router = useRouter();
  const createMutation = useCreateAssetMaintenance();

  // Form state
  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState('preventive');
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [technician, setTechnician] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  function handleSave() {
    if (!assetId) {
      toast.error('Asset ID is required');
      return;
    }
    createMutation.mutate(
      {
        assetId,
        type,
        scheduledDate: scheduledDate.toISOString().split('T')[0],
        technician: technician || undefined,
        cost: parseFloat(cost) || 0,
        notes: notes || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('Maintenance record created');
          const id = (data as { id?: string })?.id;
          if (id) {
            router.push(`/assets/maintenance/${id}`);
          } else {
            router.push('/assets/maintenance');
          }
        },
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to create maintenance record')),
      },
    );
  }

  return (
    <FormPage
      title="New Maintenance Record"
      breadcrumbs={[
        { label: 'Assets', href: '/assets' },
        { label: 'Maintenance', href: '/assets/maintenance' },
        { label: 'New Maintenance' },
      ]}
      backHref="/assets/maintenance"
      primaryAction={{
        label: 'Create Record',
        onClick: handleSave,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        {
          label: 'Cancel',
          onClick: () => router.push('/assets/maintenance'),
          variant: 'outline',
        },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Maintenance Details" columns={2}>
          <FormField label="Asset ID">
            <Input
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Asset ID or number"
            />
          </FormField>
          <FormField label="Maintenance Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maintenanceTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Scheduled Date">
            <DatePicker value={scheduledDate} onChange={setScheduledDate} />
          </FormField>
          <FormField label="Technician">
            <Input
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              placeholder="Technician or service provider"
            />
          </FormField>
          <FormField label="Estimated Cost">
            <Input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Maintenance notes or instructions"
              rows={4}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
