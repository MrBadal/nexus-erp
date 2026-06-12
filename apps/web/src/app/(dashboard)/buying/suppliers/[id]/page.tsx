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
  useSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useActivateSupplier,
  useDeactivateSupplier,
  usePurchaseOrders,
  usePurchaseReceipts,
  type PurchaseOrder,
  type PurchaseReceipt,
} from '@/hooks/use-buying';
import { useVendorLedger } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api';

// ---------------------------------------------------------------------------
// Cross-module tab sub-components
// ---------------------------------------------------------------------------

function PurchaseOrdersTab({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const { data } = usePurchaseOrders({ supplierId });
  const orders: PurchaseOrder[] = data ?? [];
  if (!orders.length)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No purchase orders yet.
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
            onClick={() => router.push(`/buying/purchase-orders/${o.id}`)}
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

function PurchaseReceiptsTab({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const { data } = usePurchaseReceipts({ supplierId });
  const receipts: PurchaseReceipt[] = data ?? [];
  if (!receipts.length)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No purchase receipts yet.
      </p>
    );
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50">
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Receipt #</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
          <th className="px-4 py-2 text-left font-medium text-muted-foreground">Warehouse</th>
        </tr>
      </thead>
      <tbody>
        {receipts.map((r) => (
          <tr
            key={r.id}
            className="border-b hover:bg-muted/30 cursor-pointer"
            onClick={() => router.push(`/buying/purchase-receipts/${r.id}`)}
          >
            <td className="px-4 py-2 font-mono text-xs">{r.receiptNumber}</td>
            <td className="px-4 py-2 text-muted-foreground">{formatDate(r.receiptDate)}</td>
            <td className="px-4 py-2">
              <span className="capitalize text-xs">{r.status}</span>
            </td>
            <td className="px-4 py-2 text-muted-foreground">{r.warehouse}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VendorLedgerTab({ supplierId }: { supplierId: string }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { data, isLoading } = useVendorLedger(supplierId, fromDate || undefined, toDate || undefined);

  const entries = data?.entries ?? [];

  return (
    <div>
      <div className="flex items-end gap-3 p-4 border-b bg-muted/20">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 w-[150px] text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 w-[150px] text-sm"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="p-4 space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No ledger entries found.</p>
      ) : (
        <div>
          <div className="flex justify-between px-4 py-2 text-xs text-muted-foreground border-b bg-muted/10">
            <span>Opening Balance: {formatCurrency(data?.openingBalance ?? 0)}</span>
            <span>Closing Balance: {formatCurrency(data?.closingBalance ?? 0)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Reference</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Debit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Credit</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(entry.date)}</td>
                  <td className="px-4 py-2">
                    <span className="capitalize text-xs">{entry.type}</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{entry.reference}</td>
                  <td className="px-4 py-2 text-right font-mono">{entry.debit ? formatCurrency(entry.debit) : '-'}</td>
                  <td className="px-4 py-2 text-right font-mono">{entry.credit ? formatCurrency(entry.credit) : '-'}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">{formatCurrency(entry.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const paymentTermsOptions = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_45', label: 'Net 45' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'net_90', label: 'Net 90' },
];

const supplierTypeOptions = [
  { value: 'company', label: 'Company' },
  { value: 'individual', label: 'Individual' },
];

const statusVariantMap: Record<string, 'success' | 'danger' | 'default'> = {
  active: 'success',
  inactive: 'danger',
};

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supplierId = params.id;

  const { data: supplier, isLoading, error } = useSupplier(supplierId);
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();
  const activateMutation = useActivateSupplier();
  const deactivateMutation = useDeactivateSupplier();

  // Local editable state
  const [activeTab, setActiveTab] = useState('purchase-orders');

  const [localName, setLocalName] = useState<string | null>(null);
  const [localSupplierType, setLocalSupplierType] = useState<string | null>(null);
  const [localEmail, setLocalEmail] = useState<string | null>(null);
  const [localPhone, setLocalPhone] = useState<string | null>(null);
  const [localWebsite, setLocalWebsite] = useState<string | null>(null);
  const [localContactPerson, setLocalContactPerson] = useState<string | null>(null);
  const [localStreet, setLocalStreet] = useState<string | null>(null);
  const [localCity, setLocalCity] = useState<string | null>(null);
  const [localState, setLocalState] = useState<string | null>(null);
  const [localCountry, setLocalCountry] = useState<string | null>(null);
  const [localPostalCode, setLocalPostalCode] = useState<string | null>(null);
  const [localPaymentTerms, setLocalPaymentTerms] = useState<string | null>(null);
  const [localCreditLimit, setLocalCreditLimit] = useState<string | null>(null);
  const [localTaxId, setLocalTaxId] = useState<string | null>(null);
  const [localBankAccount, setLocalBankAccount] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<string | null>(null);

  const status = supplier?.status ?? 'active';
  const isInactive = status === 'inactive';

  const currentName = localName ?? supplier?.name ?? '';
  const currentSupplierType = localSupplierType ?? supplier?.supplierType ?? 'company';
  const currentEmail = localEmail ?? supplier?.email ?? '';
  const currentPhone = localPhone ?? supplier?.phone ?? '';
  const currentWebsite = localWebsite ?? supplier?.website ?? '';
  const currentContactPerson = localContactPerson ?? supplier?.contactPerson ?? '';
  const currentStreet = localStreet ?? supplier?.street ?? '';
  const currentCity = localCity ?? supplier?.city ?? '';
  const currentState = localState ?? supplier?.state ?? '';
  const currentCountry = localCountry ?? supplier?.country ?? '';
  const currentPostalCode = localPostalCode ?? supplier?.postalCode ?? '';
  const currentPaymentTerms = localPaymentTerms ?? supplier?.paymentTerms ?? 'net_30';
  const currentCreditLimit = localCreditLimit ?? supplier?.creditLimit ?? '';
  const currentTaxId = localTaxId ?? supplier?.taxId ?? '';
  const currentBankAccount = localBankAccount ?? supplier?.bankAccount ?? '';
  const currentNotes = localNotes ?? supplier?.notes ?? '';

  function handleSave() {
    if (!supplier) return;
    updateMutation.mutate(
      {
        id: supplierId,
        data: {
          name: currentName,
          supplierType: currentSupplierType,
          email: currentEmail,
          phone: currentPhone,
          website: currentWebsite || null,
          contactPerson: currentContactPerson || null,
          street: currentStreet || null,
          city: currentCity || null,
          state: currentState || null,
          country: currentCountry || null,
          postalCode: currentPostalCode || null,
          paymentTerms: currentPaymentTerms,
          creditLimit: currentCreditLimit || null,
          taxId: currentTaxId || null,
          bankAccount: currentBankAccount || null,
          notes: currentNotes || null,
        },
      },
      {
        onSuccess: () => toast.success('Supplier saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save supplier')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(supplierId, {
      onSuccess: () => {
        toast.success('Supplier deleted');
        router.push('/buying/suppliers');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete supplier')),
    });
  }

  function handleActivate() {
    activateMutation.mutate(supplierId, {
      onSuccess: () => toast.success('Supplier activated'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to activate supplier')),
    });
  }

  function handleDeactivate() {
    deactivateMutation.mutate(supplierId, {
      onSuccess: () => toast.success('Supplier deactivated'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to deactivate supplier')),
    });
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading supplier' : 'Supplier not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/buying/suppliers')}
          >
            Back to suppliers
          </button>
        </div>
      </div>
    );
  }

  const meta = [
    {
      label: 'Supplier #',
      value: (
        <span className="font-mono">
          {supplier.supplierNumber ?? '—'}
        </span>
      ),
    },
    { label: 'Status', value: status },
    { label: 'Created', value: formatDate(supplier.createdAt) },
    { label: 'Updated', value: formatDate(supplier.updatedAt) },
  ];

  return (
    <FormPage
      title={supplier.name}
      breadcrumbs={[
        { label: 'Buying', href: '/buying' },
        { label: 'Suppliers', href: '/buying/suppliers' },
        { label: supplier.name },
      ]}
      backHref="/buying/suppliers"
      status={{
        label: status === 'active' ? 'Active' : 'Inactive',
        variant: statusVariantMap[status] ?? 'default',
      }}
      primaryAction={{
        label: 'Save',
        onClick: handleSave,
        loading: updateMutation.isPending,
      }}
      secondaryActions={[
        isInactive
          ? { label: 'Activate', onClick: handleActivate, variant: 'outline' as const }
          : { label: 'Deactivate', onClick: handleDeactivate, variant: 'outline' as const },
      ]}
      dangerAction={{ label: 'Delete', onClick: handleDelete }}
      meta={meta}
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <FormSection title="Basic Information" columns={2}>
          <FormField label="Supplier Number">
            <Input
              value={supplier.supplierNumber ?? ''}
              readOnly
              className="font-mono bg-muted"
            />
          </FormField>
          <FormField label="Supplier Type">
            <Select value={currentSupplierType} onValueChange={setLocalSupplierType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supplierTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Name" className="col-span-2">
            <Input
              value={currentName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Supplier name"
            />
          </FormField>
        </FormSection>

        {/* Contact */}
        <FormSection title="Contact Information" columns={2}>
          <FormField label="Email">
            <Input
              type="email"
              value={currentEmail}
              onChange={(e) => setLocalEmail(e.target.value)}
              placeholder="orders@supplier.com"
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={currentPhone}
              onChange={(e) => setLocalPhone(e.target.value)}
              placeholder="+1-555-0000"
            />
          </FormField>
          <FormField label="Website">
            <Input
              value={currentWebsite}
              onChange={(e) => setLocalWebsite(e.target.value)}
              placeholder="https://www.supplier.com"
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
          <FormField label="Street" className="col-span-2">
            <Input
              value={currentStreet}
              onChange={(e) => setLocalStreet(e.target.value)}
              placeholder="123 Main Street"
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
              placeholder="00000"
            />
          </FormField>
        </FormSection>

        {/* Financial */}
        <FormSection title="Financial" columns={2}>
          <FormField label="Payment Terms">
            <Select value={currentPaymentTerms} onValueChange={setLocalPaymentTerms}>
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
          <FormField label="Credit Limit">
            <Input
              value={currentCreditLimit}
              onChange={(e) => setLocalCreditLimit(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Tax ID / VAT">
            <Input
              value={currentTaxId}
              onChange={(e) => setLocalTaxId(e.target.value)}
              placeholder="Tax identification number"
            />
          </FormField>
          <FormField label="Bank Account">
            <Input
              value={currentBankAccount}
              onChange={(e) => setLocalBankAccount(e.target.value)}
              placeholder="Bank account details"
            />
          </FormField>
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes" columns={1}>
          <FormField label="Notes">
            <Textarea
              value={currentNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Internal notes about this supplier"
              rows={4}
            />
          </FormField>
        </FormSection>

        {/* Cross-module tabs */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex border-b bg-muted/30">
            {[
              { key: 'purchase-orders', label: 'Purchase Orders' },
              { key: 'purchase-receipts', label: 'Purchase Receipts' },
              { key: 'vendor-ledger', label: 'Vendor Ledger' },
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
            {activeTab === 'purchase-orders' && (
              <PurchaseOrdersTab supplierId={supplierId} />
            )}
            {activeTab === 'purchase-receipts' && (
              <PurchaseReceiptsTab supplierId={supplierId} />
            )}
            {activeTab === 'vendor-ledger' && (
              <VendorLedgerTab supplierId={supplierId} />
            )}
          </div>
        </div>
      </div>
    </FormPage>
  );
}
