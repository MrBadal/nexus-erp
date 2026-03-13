'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecordPayment } from '@/hooks/use-invoices';
import { formatCurrency } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordPaymentDialogProps {
  invoiceId: string;
  balanceDue: number;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Payment method options
// ---------------------------------------------------------------------------

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'online', label: 'Online' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecordPaymentDialog({
  invoiceId,
  balanceDue,
  currency,
  open,
  onOpenChange,
  onSuccess,
}: RecordPaymentDialogProps) {
  const recordPayment = useRecordPayment();

  const [amount, setAmount] = useState(balanceDue);
  const [date, setDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form when dialog opens
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setAmount(balanceDue);
      setDate(new Date());
      setPaymentMethod('bank_transfer');
      setReference('');
      setErrorMessage('');
    }
    onOpenChange(nextOpen);
  }

  // Validation
  function validate(): boolean {
    if (amount <= 0) {
      setErrorMessage('Amount must be greater than 0');
      return false;
    }
    if (amount > balanceDue) {
      setErrorMessage(`Amount cannot exceed balance due (${formatCurrency(balanceDue, currency)})`);
      return false;
    }
    setErrorMessage('');
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;

    recordPayment.mutate(
      {
        id: invoiceId,
        data: {
          amount: String(amount),
          date: date.toISOString().split('T')[0],
          paymentMethod,
          reference: reference || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Payment recorded successfully');
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Failed to record payment';
          setErrorMessage(message);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Balance due: {formatCurrency(balanceDue, currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Amount" required>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              currency={currency}
              placeholder="0.00"
            />
          </FormField>

          <FormField label="Date" required>
            <DatePicker value={date} onChange={setDate} />
          </FormField>

          <FormField label="Payment Method" required>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Reference">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction reference (optional)"
            />
          </FormField>

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={recordPayment.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={recordPayment.isPending}
          >
            {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
