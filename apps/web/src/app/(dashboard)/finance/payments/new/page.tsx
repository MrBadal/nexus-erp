'use client';

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
import { useCreatePayment } from '@/hooks/use-payments';

interface FormData {
  type: 'received' | 'made';
  paymentDate: string;
  amount: string;
  paymentMethod: string;
  reference: string;
  partyName: string;
  invoiceId: string;
  billId: string;
  notes: string;
}

const initialFormData: FormData = {
  type: 'received',
  paymentDate: new Date().toISOString().split('T')[0],
  amount: '',
  paymentMethod: 'bank_transfer',
  reference: '',
  partyName: '',
  invoiceId: '',
  billId: '',
  notes: '',
};

export default function NewPaymentPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const createPayment = useCreatePayment();

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.amount || Number(form.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!form.paymentDate) newErrors.paymentDate = 'Payment date is required';
    if (!form.partyName.trim()) newErrors.partyName = 'Party name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    createPayment.mutate(
      {
        type: form.type,
        paymentDate: form.paymentDate,
        amount: form.amount,
        paymentMethod: form.paymentMethod || undefined,
        reference: form.reference || undefined,
        partyName: form.partyName,
        invoiceId: form.invoiceId || undefined,
        billId: form.billId || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Payment recorded successfully');
          router.push('/finance/payments');
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Failed to record payment');
        },
      },
    );
  };

  return (
    <FormPage
      title="Record Payment"
      subtitle="Record a new payment received or made"
      backHref="/finance/payments"
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Payments', href: '/finance/payments' },
        { label: 'New Payment' },
      ]}
      primaryAction={{
        label: 'Record Payment',
        onClick: handleSubmit,
        loading: createPayment.isPending,
        disabled: createPayment.isPending,
      }}
      secondaryActions={[
        { label: 'Cancel', onClick: () => router.push('/finance/payments'), variant: 'outline' },
      ]}
    >
      <div className="space-y-6">
        <FormSection title="Payment Details" columns={2}>
          <FormField label="Payment Type" required>
            <Select value={form.type} onValueChange={(v) => update('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="received">Payment Received</SelectItem>
                <SelectItem value="made">Payment Made</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Payment Date" required error={errors.paymentDate}>
            <Input type="date" value={form.paymentDate} onChange={(e) => update('paymentDate', e.target.value)} />
          </FormField>
          <FormField label="Amount" required error={errors.amount}>
            <Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => update('amount', e.target.value)} min="0" step="0.01" />
          </FormField>
          <FormField label="Payment Method">
            <Select value={form.paymentMethod} onValueChange={(v) => update('paymentMethod', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Party Name" required error={errors.partyName}>
            <Input placeholder="Customer or supplier name" value={form.partyName} onChange={(e) => update('partyName', e.target.value)} />
          </FormField>
          <FormField label="Reference Number">
            <Input placeholder="Transaction reference" value={form.reference} onChange={(e) => update('reference', e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Link to Document" columns={2}>
          <FormField label="Invoice ID">
            <Input placeholder="Link to an invoice (optional)" value={form.invoiceId} onChange={(e) => update('invoiceId', e.target.value)} />
          </FormField>
          <FormField label="Bill ID">
            <Input placeholder="Link to a bill (optional)" value={form.billId} onChange={(e) => update('billId', e.target.value)} />
          </FormField>
        </FormSection>

        <FormSection title="Additional Information" columns={1}>
          <FormField label="Notes">
            <Textarea placeholder="Any additional notes..." value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
