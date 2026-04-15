'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useCreateDeliveryNote, useCustomers, useSalesOrders } from '@/hooks/use-selling';

export default function NewDeliveryNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createDeliveryNote = useCreateDeliveryNote();
  const { data: customers } = useCustomers();
  const { data: salesOrders } = useSalesOrders();

  const [salesOrderId, setSalesOrderId] = useState(searchParams.get('soId') || '');
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!customerId) { toast.error('Customer is required'); return; }

    createDeliveryNote.mutate(
      {
        salesOrderId: salesOrderId || undefined,
        customerId,
        deliveryDate,
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        shippingAddress: shippingAddress || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => { toast.success('Delivery note created'); router.push('/selling/delivery-notes'); },
        onError: (error: Error) => { toast.error(error.message || 'Failed to create delivery note'); },
      },
    );
  };

  return (
    <FormPage
      title="New Delivery Note"
      subtitle="Create a new delivery note for shipment"
      backHref="/selling/delivery-notes"
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Delivery Notes', href: '/selling/delivery-notes' },
        { label: 'New Delivery Note' },
      ]}
      primaryAction={{ label: 'Create Delivery Note', onClick: handleSubmit, loading: createDeliveryNote.isPending }}
      secondaryActions={[{ label: 'Cancel', onClick: () => router.push('/selling/delivery-notes'), variant: 'outline' }]}
    >
      <div className="space-y-6">
        <FormSection title="Delivery Details" columns={2}>
          <FormField label="Sales Order">
            <Select value={salesOrderId} onValueChange={setSalesOrderId}>
              <SelectTrigger><SelectValue placeholder="Link to sales order (optional)" /></SelectTrigger>
              <SelectContent>
                {(salesOrders ?? []).map((so) => (
                  <SelectItem key={so.id} value={so.id}>{so.orderNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Customer" required>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Delivery Date" required>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Shipping Information" columns={2}>
          <FormField label="Carrier">
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="delhivery">Delhivery</SelectItem>
                <SelectItem value="bluedart">Blue Dart</SelectItem>
                <SelectItem value="dtdc">DTDC</SelectItem>
                <SelectItem value="professional_couriers">Professional Couriers</SelectItem>
                <SelectItem value="self">Self Delivery</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Tracking Number">
            <Input placeholder="Tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
          </FormField>
          <FormField label="Shipping Address">
            <Input placeholder="Delivery address" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea placeholder="Delivery instructions or notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
