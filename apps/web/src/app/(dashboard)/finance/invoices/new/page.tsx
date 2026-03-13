'use client';

import { useState, useMemo, useCallback } from 'react';
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
import {
  InlineGrid,
  type InlineGridColumn,
} from '@/components/ui/inline-grid';
import { Card, CardContent } from '@/components/ui/card';
import { useCreateInvoice } from '@/hooks/use-invoices';
import { formatCurrency } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  amount: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const paymentTermsOptions = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_7', label: 'Net 7' },
  { value: 'net_10', label: 'Net 10' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'net_90', label: 'Net 90' },
];

const typeOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note', label: 'Debit Note' },
  { value: 'proforma', label: 'Proforma' },
];

const lineColumns: InlineGridColumn<LineItem>[] = [
  {
    key: 'description',
    header: 'Description',
    type: 'text',
    width: '2fr',
    placeholder: 'Item description',
  },
  {
    key: 'quantity',
    header: 'Qty',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    key: 'unitPrice',
    header: 'Unit Price',
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    key: 'discountPercent',
    header: 'Disc %',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    key: 'amount',
    header: 'Amount',
    type: 'readonly',
    width: '120px',
    align: 'right',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function calcLineAmount(line: LineItem): number {
  return line.quantity * line.unitPrice * (1 - line.discountPercent / 100);
}

function emptyLine(): LineItem {
  return { description: '', quantity: 1, unitPrice: 0, discountPercent: 0, amount: 0 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewInvoicePage() {
  const router = useRouter();
  const createMutation = useCreateInvoice();

  // Form state
  const [type, setType] = useState('standard');
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [paymentTerms, setPaymentTerms] = useState('net_30');
  const [currency] = useState('USD');
  const [customerName, setCustomerName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // Auto-update due date when payment terms change
  const handlePaymentTermsChange = useCallback(
    (value: string) => {
      setPaymentTerms(value);
      const daysMap: Record<string, number> = {
        due_on_receipt: 0,
        net_7: 7,
        net_10: 10,
        net_15: 15,
        net_30: 30,
        net_45: 45,
        net_60: 60,
        net_90: 90,
      };
      const days = daysMap[value] ?? 30;
      setDueDate(addDays(issueDate, days));
    },
    [issueDate],
  );

  // Line item handlers
  function handleLineChange(updatedLines: LineItem[]) {
    const recalculated = updatedLines.map((l) => ({
      ...l,
      amount: calcLineAmount(l),
    }));
    setLines(recalculated);
  }

  function handleAddLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function handleRemoveLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  // Totals
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + calcLineAmount(l), 0),
    [lines],
  );
  const grandTotal = subtotal; // No discount/tax inputs on create for now

  // Save handler
  function handleSave() {
    createMutation.mutate(
      {
        type,
        issueDate: issueDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        paymentTerms,
        currencyCode: currency,
        notes: notes || undefined,
        lines: lines.map((l, i) => ({
          lineNumber: i + 1,
          description: l.description,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
          discountAmount: String(l.discountPercent),
          taxAmount: '0',
          amount: String(calcLineAmount(l)),
        })),
      },
      {
        onSuccess: (data) => {
          toast.success('Invoice created');
          router.push(`/finance/invoices/${data.id}`);
        },
        onError: () => {
          toast.error('Failed to create invoice');
        },
      },
    );
  }

  return (
    <FormPage
      title="New Invoice"
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Invoices', href: '/finance/invoices' },
        { label: 'New Invoice' },
      ]}
      backHref="/finance/invoices"
      primaryAction={{
        label: 'Save as Draft',
        onClick: handleSave,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        {
          label: 'Cancel',
          onClick: () => router.push('/finance/invoices'),
          variant: 'outline',
        },
      ]}
    >
      <div className="space-y-6">
        {/* Invoice Details */}
        <FormSection title="Invoice Details" columns={2}>
          <FormField label="Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Currency">
            <Input value={currency} readOnly className="bg-muted" />
          </FormField>
          <FormField label="Issue Date">
            <DatePicker value={issueDate} onChange={setIssueDate} />
          </FormField>
          <FormField label="Due Date">
            <DatePicker value={dueDate} onChange={setDueDate} />
          </FormField>
          <FormField label="Payment Terms">
            <Select value={paymentTerms} onValueChange={handlePaymentTermsChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentTermsOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        {/* Customer */}
        <FormSection title="Customer" columns={2}>
          <FormField label="Customer Name">
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
            />
          </FormField>
          <div /> {/* spacer */}
          <FormField label="Billing Address">
            <Textarea
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Billing address"
              rows={3}
            />
          </FormField>
          <FormField label="Shipping Address">
            <Textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Shipping address"
              rows={3}
            />
          </FormField>
        </FormSection>

        {/* Line Items */}
        <FormSection title="Line Items" columns={1} collapsible={false}>
          <InlineGrid<LineItem>
            columns={lineColumns}
            rows={lines.map((l) => ({
              ...l,
              amount: formatCurrency(calcLineAmount(l), currency) as unknown as number,
            }))}
            onChange={(rows) => {
              handleLineChange(
                rows.map((r) => ({
                  ...r,
                  amount: typeof r.amount === 'string' ? 0 : (r.amount as number),
                })),
              );
            }}
            onAddRow={handleAddLine}
            onRemoveRow={handleRemoveLine}
            addRowLabel="+ Add Line"
          />
        </FormSection>

        {/* Totals */}
        <div className="flex justify-end">
          <Card className="w-80">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Grand Total</span>
                <span className="text-lg font-bold font-mono">
                  {formatCurrency(grandTotal, currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes"
              rows={3}
            />
          </FormField>
          <FormField label="Customer Notes">
            <Textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Notes visible to customer"
              rows={3}
            />
          </FormField>
          <FormField label="Terms & Conditions">
            <Textarea
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              placeholder="Terms and conditions"
              rows={3}
            />
          </FormField>
        </FormSection>
      </div>
    </FormPage>
  );
}
