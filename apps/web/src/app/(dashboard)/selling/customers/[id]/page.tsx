'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useSalesOrders,
  useQuotations,
  type Customer,
  type SalesOrder,
  type Quotation,
} from '@/hooks/use-selling';
import { useInvoices, type Invoice } from '@/hooks/use-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Cross-module tab sub-components
// ---------------------------------------------------------------------------

function SalesOrdersTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { data } = useSalesOrders({ customerId });
  const orders: SalesOrder[] = data ?? [];
  if (!orders.length)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No sales orders found for this customer.
      </p>
    );
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50">
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Order #</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr
            key={o.id}
            className="border-b hover:bg-muted/30 cursor-pointer"
            onClick={() => router.push(`/selling/sales-orders/${o.id}`)}
          >
            <td className="px-4 py-2 font-mono text-xs">{o.orderNumber}</td>
            <td className="px-4 py-2 text-muted-foreground">{formatDate(o.orderDate)}</td>
            <td className="px-4 py-2">
              <span className="capitalize text-xs">{o.status}</span>
            </td>
            <td className="px-4 py-2 text-right font-mono">{formatCurrency(o.totalAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InvoicesTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { data } = useInvoices({ customerId });
  const invoices: Invoice[] = data ?? [];
  if (!invoices.length)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No invoices found for this customer.
      </p>
    );
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50">
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Invoice #</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Due Date</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
          <tr
            key={inv.id}
            className="border-b hover:bg-muted/30 cursor-pointer"
            onClick={() => router.push(`/finance/invoices/${inv.id}`)}
          >
            <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
            <td className="px-4 py-2 text-muted-foreground">{formatDate(inv.dueDate)}</td>
            <td className="px-4 py-2">
              <span className="capitalize text-xs">{inv.status}</span>
            </td>
            <td className="px-4 py-2 text-right font-mono">
              {formatCurrency(parseFloat(inv.total))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QuotationsTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { data } = useQuotations({ customerId });
  const quotations: Quotation[] = data ?? [];
  if (!quotations.length)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No quotations found for this customer.
      </p>
    );
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50">
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Quotation #</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
        </tr>
      </thead>
      <tbody>
        {quotations.map((q) => (
          <tr
            key={q.id}
            className="border-b hover:bg-muted/30 cursor-pointer"
            onClick={() => router.push(`/selling/quotations/${q.id}`)}
          >
            <td className="px-4 py-2 font-mono text-xs">{q.quotationNumber}</td>
            <td className="px-4 py-2 text-muted-foreground">{formatDate(q.quotationDate)}</td>
            <td className="px-4 py-2">
              <span className="capitalize text-xs">{q.status}</span>
            </td>
            <td className="px-4 py-2 text-right font-mono">{formatCurrency(q.totalAmount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type CustomerStatus = Customer['status'];
type CustomerType = Customer['customerType'];

const statusVariantMap: Record<CustomerStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  inactive: 'default',
  blocked: 'danger',
};

const paymentTermsOptions = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_7', label: 'Net 7' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'net_90', label: 'Net 90' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params.id;

  const { data: customer, isLoading, error } = useCustomer(customerId);
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const [activeTab, setActiveTab] = useState('sales-orders');

  // Local editable state — null means "use server value"
  const [localName, setLocalName] = useState<string | null>(null);
  const [localCustomerType, setLocalCustomerType] = useState<CustomerType | null>(null);
  const [localStatus, setLocalStatus] = useState<CustomerStatus | null>(null);
  const [localEmail, setLocalEmail] = useState<string | null>(null);
  const [localPhone, setLocalPhone] = useState<string | null>(null);
  const [localWebsite, setLocalWebsite] = useState<string | null>(null);
  const [localContactPerson, setLocalContactPerson] = useState<string | null>(null);
  const [localStreet, setLocalStreet] = useState<string | null>(null);
  const [localCity, setLocalCity] = useState<string | null>(null);
  const [localState, setLocalState] = useState<string | null>(null);
  const [localCountry, setLocalCountry] = useState<string | null>(null);
  const [localPostalCode, setLocalPostalCode] = useState<string | null>(null);
  const [localCreditLimit, setLocalCreditLimit] = useState<string | null>(null);
  const [localPaymentTerms, setLocalPaymentTerms] = useState<string | null>(null);
  const [localCurrency, setLocalCurrency] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  // Derived current values
  const currentName = localName ?? customer?.name ?? '';
  const currentCustomerType = localCustomerType ?? customer?.customerType ?? 'company';
  const currentStatus = localStatus ?? customer?.status ?? 'active';
  const currentEmail = localEmail ?? customer?.email ?? '';
  const currentPhone = localPhone ?? customer?.phone ?? '';
  const currentWebsite = localWebsite ?? '';
  const currentContactPerson = localContactPerson ?? '';
  const currentStreet = localStreet ?? customer?.billingAddress ?? '';
  const currentCity = localCity ?? customer?.billingCity ?? '';
  const currentState = localState ?? customer?.billingState ?? '';
  const currentCountry = localCountry ?? customer?.billingCountry ?? '';
  const currentPostalCode = localPostalCode ?? customer?.billingPostalCode ?? '';
  const currentCreditLimit = localCreditLimit ?? String(customer?.creditLimit ?? '');
  const currentPaymentTerms = localPaymentTerms ?? customer?.paymentTerms ?? 'net_30';
  const currentCurrency = localCurrency ?? customer?.currency ?? 'INR';
  const currentNotes = localNotes ?? '';

  // Handlers
  function handleSave() {
    if (!customer) return;
    updateMutation.mutate(
      {
        id: customerId,
        data: {
          name: currentName,
          customerType: currentCustomerType,
          status: currentStatus,
          email: currentEmail,
          phone: currentPhone,
          billingAddress: currentStreet,
          billingCity: currentCity,
          billingState: currentState,
          billingCountry: currentCountry,
          billingPostalCode: currentPostalCode,
          creditLimit: currentCreditLimit ? parseFloat(currentCreditLimit) : null,
          paymentTerms: currentPaymentTerms,
          currency: currentCurrency,
        },
      },
      {
        onSuccess: () => toast.success('Customer saved'),
        onError: () => toast.error('Failed to save customer'),
      },
    );
  }

  function handleDelete() {
    if (!confirm(`Delete customer "${customer?.name}"? This action cannot be undone.`)) return;
    deleteMutation.mutate(customerId, {
      onSuccess: () => {
        toast.success('Customer deleted');
        router.push('/selling/customers');
      },
      onError: () => toast.error('Failed to delete customer'),
    });
  }

  function handleToggleStatus() {
    if (!customer) return;
    const newStatus: CustomerStatus = currentStatus === 'active' ? 'inactive' : 'active';
    updateMutation.mutate(
      { id: customerId, data: { status: newStatus } },
      {
        onSuccess: () => {
          setLocalStatus(newStatus);
          toast.success(`Customer ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        },
        onError: () => toast.error('Failed to update status'),
      },
    );
  }

  // ---------- Loading / Error ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading customer' : 'Customer not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/selling/customers')}
          >
            Back to customers
          </button>
        </div>
      </div>
    );
  }

  const meta = [
    { label: 'Customer #', value: <span className="font-mono text-sm">{customer.customerNumber}</span> },
    { label: 'Type', value: currentCustomerType === 'company' ? 'Company' : 'Individual' },
    {
      label: 'Outstanding Balance',
      value: (
        <span className={customer.outstandingBalance > 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}>
          {formatCurrency(customer.outstandingBalance)}
        </span>
      ),
    },
    { label: 'Created', value: formatDate(customer.createdAt) },
    { label: 'Last Updated', value: formatDate(customer.updatedAt) },
  ];

  const secondaryActions = [];
  if (currentStatus === 'active') {
    secondaryActions.push({ label: 'Deactivate', onClick: handleToggleStatus, variant: 'outline' as const });
  } else if (currentStatus === 'inactive') {
    secondaryActions.push({ label: 'Activate', onClick: handleToggleStatus, variant: 'outline' as const });
  }

  return (
    <FormPage
      title={customer.name}
      breadcrumbs={[
        { label: 'Selling', href: '/selling' },
        { label: 'Customers', href: '/selling/customers' },
        { label: customer.name },
      ]}
      backHref="/selling/customers"
      status={{ label: currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1), variant: statusVariantMap[currentStatus] }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      secondaryActions={secondaryActions}
      dangerAction={{ label: 'Delete', onClick: handleDelete, disabled: deleteMutation.isPending }}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <FormSection title="Basic Information" columns={2}>
          <FormField label="Customer Number">
            <Input value={customer.customerNumber} readOnly className="font-mono bg-muted" />
          </FormField>
          <FormField label="Name" required>
            <Input
              value={currentName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Customer name"
            />
          </FormField>
          <FormField label="Type">
            <Select value={currentCustomerType} onValueChange={(v) => setLocalCustomerType(v as CustomerType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={currentStatus} onValueChange={(v) => setLocalStatus(v as CustomerStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        {/* Contact Information */}
        <FormSection title="Contact Information" columns={2}>
          <FormField label="Email">
            <Input
              type="email"
              value={currentEmail}
              onChange={(e) => setLocalEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={currentPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              placeholder="+1-555-0100"
            />
          </FormField>
          <FormField label="Website">
            <Input
              value={currentWebsite}
              onChange={(e) => setLocalWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </FormField>
          <FormField label="Contact Person">
            <Input
              value={currentContactPerson}
              onChange={(e) => setLocalContactPerson(e.target.value)}
              placeholder="Primary contact name"
            />
          </FormField>
        </FormSection>

        {/* Address */}
        <FormSection title="Address" columns={2}>
          <FormField label="Street" className="md:col-span-2">
            <Input
              value={currentStreet}
              onChange={(e) => setLocalStreet(e.target.value)}
              placeholder="Street address"
            />
          </FormField>
          <FormField label="City">
            <Input
              value={currentCity}
              onChange={(e) => setLocalCity(e.target.value)}
              placeholder="City"
            />
          </FormField>
          <FormField label="State / Province">
            <Input
              value={currentState}
              onChange={(e) => setLocalState(e.target.value)}
              placeholder="State"
            />
          </FormField>
          <FormField label="Country">
            <Input
              value={currentCountry}
              onChange={(e) => setLocalCountry(e.target.value)}
              placeholder="Country"
            />
          </FormField>
          <FormField label="Postal Code">
            <Input
              value={currentPostalCode}
              onChange={(e) => setLocalPostalCode(e.target.value)}
              placeholder="Postal code"
            />
          </FormField>
        </FormSection>

        {/* Financial */}
        <FormSection title="Financial Settings" columns={2}>
          <FormField label="Credit Limit">
            <Input
              type="number"
              value={currentCreditLimit}
              onChange={(e) => setLocalCreditLimit(e.target.value)}
              placeholder="0.00"
              min={0}
              step={0.01}
            />
          </FormField>
          <FormField label="Currency">
            <Input
              value={currentCurrency}
              onChange={(e) => setLocalCurrency(e.target.value)}
              placeholder="INR"
            />
          </FormField>
          <FormField label="Payment Terms">
            <Select value={currentPaymentTerms} onValueChange={(v) => setLocalPaymentTerms(v)}>
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

        {/* Notes */}
        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Internal notes about this customer"
              rows={4}
            />
          </FormField>
        </FormSection>

        {/* Cross-module tabs */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex border-b bg-muted/30">
            {[
              { key: 'sales-orders', label: 'Sales Orders' },
              { key: 'invoices', label: 'Invoices' },
              { key: 'quotations', label: 'Quotations' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-0">
            {activeTab === 'sales-orders' && (
              <SalesOrdersTab customerId={customerId} />
            )}
            {activeTab === 'invoices' && (
              <InvoicesTab customerId={customerId} />
            )}
            {activeTab === 'quotations' && (
              <QuotationsTab customerId={customerId} />
            )}
          </div>
        </div>
      </div>
    </FormPage>
  );
}
