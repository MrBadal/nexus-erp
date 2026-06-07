'use client';

import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  usePayrollEntry,
  useApprovePayroll,
  usePayPayroll,
  useVoidPayroll,
  useDeletePayrollEntry,
  type PayrollEntry,
  type PayrollEntryComponent,
} from '@/hooks/use-hr';
import { formatCurrency, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

type PayrollStatus = PayrollEntry['status'];

const statusVariantMap: Record<
  PayrollStatus,
  'success' | 'warning' | 'info' | 'default'
> = {
  draft: 'default',
  pending: 'warning',
  submitted: 'info',
  processing: 'info',
  approved: 'success',
  paid: 'success',
};

const statusLabelMap: Record<PayrollStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  submitted: 'Submitted',
  processing: 'Processing',
  approved: 'Approved',
  paid: 'Paid',
};

// Statutory component codes for identification
const STATUTORY_CODES = new Set([
  'EPF_EMPLOYEE',
  'ESIC_EMPLOYEE',
  'TDS',
  'PROFESSIONAL_TAX',
  'LOP_DEDUCTION',
]);

// ---------------------------------------------------------------------------
// Helper: Split components into earnings and deductions
// ---------------------------------------------------------------------------

function splitComponents(components: PayrollEntryComponent[]) {
  const earnings: PayrollEntryComponent[] = [];
  const structuralDeductions: PayrollEntryComponent[] = [];
  const statutoryDeductions: PayrollEntryComponent[] = [];

  for (const comp of components) {
    if (comp.type === 'earning') {
      earnings.push(comp);
    } else if (STATUTORY_CODES.has(comp.componentCode)) {
      statutoryDeductions.push(comp);
    } else {
      structuralDeductions.push(comp);
    }
  }

  return { earnings, structuralDeductions, statutoryDeductions };
}

// ---------------------------------------------------------------------------
// Component Table
// ---------------------------------------------------------------------------

function ComponentTable({
  title,
  components,
  variant = 'default',
}: {
  title: string;
  components: PayrollEntryComponent[];
  variant?: 'default' | 'success' | 'danger';
}) {
  const total = components.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const colorClass =
    variant === 'success'
      ? 'text-green-700'
      : variant === 'danger'
        ? 'text-red-700'
        : '';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {components.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">No components.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  Component
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">
                  Code
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp) => (
                <tr key={comp.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{comp.componentName}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {comp.componentCode}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono ${colorClass}`}>
                    {formatCurrency(parseFloat(comp.amount))}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-4 py-2" colSpan={2}>
                  Total {title}
                </td>
                <td className={`px-4 py-2 text-right font-mono ${colorClass}`}>
                  {formatCurrency(total)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PayrollDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const payrollId = params.id;

  const { data: payroll, isLoading, error } = usePayrollEntry(payrollId);
  const approveMutation = useApprovePayroll();
  const payMutation = usePayPayroll();
  const voidMutation = useVoidPayroll();
  const deleteMutation = useDeletePayrollEntry();

  const status: PayrollStatus = payroll?.status ?? 'draft';
  const canApprove = status === 'draft' || status === 'submitted' || status === 'pending';
  const canPay = status === 'approved';
  const canVoid = status === 'approved' || status === 'paid';
  const canDelete = status === 'draft' || status === 'submitted';

  function handleApprove() {
    approveMutation.mutate(payrollId, {
      onSuccess: () => toast.success('Payroll approved'),
      onError: () => toast.error('Failed to approve payroll'),
    });
  }

  function handlePay() {
    payMutation.mutate(payrollId, {
      onSuccess: () => toast.success('Payroll marked as paid'),
      onError: () => toast.error('Failed to mark payroll as paid'),
    });
  }

  function handleVoid() {
    if (!confirm('Void this payroll entry? This reverses the posted accounting journal and returns the entry to draft.')) return;
    voidMutation.mutate(payrollId, {
      onSuccess: () => toast.success('Payroll voided and GL journal reversed'),
      onError: () => toast.error('Failed to void payroll'),
    });
  }

  function handleDelete() {
    if (!confirm('Delete this payroll entry? This cannot be undone.')) return;
    deleteMutation.mutate(payrollId, {
      onSuccess: () => {
        toast.success('Payroll entry deleted');
        router.push('/hr/payroll');
      },
      onError: () => toast.error('Failed to delete payroll entry'),
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !payroll) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading payroll entry' : 'Payroll entry not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/hr/payroll')}
          >
            Back to payroll
          </button>
        </div>
      </div>
    );
  }

  // Parse components
  const components = payroll.components ?? [];
  const { earnings, structuralDeductions, statutoryDeductions } =
    splitComponents(components);

  const grossPay = payroll.grossPay ?? 0;
  const totalDeductions = payroll.totalDeductions ?? payroll.deductions ?? 0;
  const netPay = payroll.netPay ?? 0;
  const employerEpf = payroll.employerEpf ?? 0;
  const employerEsic = payroll.employerEsic ?? 0;
  const totalCTC = grossPay + employerEpf + employerEsic;

  // Actions
  const primaryAction = canApprove
    ? {
        label: 'Approve Payroll',
        onClick: handleApprove,
        loading: approveMutation.isPending,
      }
    : canPay
      ? {
          label: 'Mark as Paid',
          onClick: handlePay,
          loading: payMutation.isPending,
        }
      : undefined;

  const secondaryActions = canVoid
    ? [
        {
          label: voidMutation.isPending ? 'Voiding…' : 'Void',
          onClick: handleVoid,
          variant: 'outline' as const,
          disabled: voidMutation.isPending,
        },
      ]
    : undefined;

  const dangerAction = canDelete
    ? { label: 'Delete', onClick: handleDelete, disabled: deleteMutation.isPending }
    : undefined;

  const meta = [
    { label: 'Period', value: payroll.period },
    {
      label: 'Status',
      value: (
        <Badge
          variant="secondary"
          className={
            status === 'approved' || status === 'paid'
              ? 'bg-emerald-100 text-emerald-700'
              : status === 'submitted' || status === 'processing'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
          }
        >
          {statusLabelMap[status]}
        </Badge>
      ),
    },
    { label: 'Created', value: formatDate(payroll.createdAt) },
  ];

  return (
    <FormPage
      title={`Payslip — ${payroll.period}`}
      breadcrumbs={[
        { label: 'HR', href: '/hr' },
        { label: 'Payroll', href: '/hr/payroll' },
        { label: payroll.period },
      ]}
      backHref="/hr/payroll"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      dangerAction={dangerAction}
      meta={meta}
    >
      <div className="space-y-6">
        {/* ── Attendance Summary ── */}
        {(payroll.workingDays != null || payroll.lopDays != null) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Working Days</p>
                  <p className="text-lg font-bold">
                    {payroll.workingDays ?? '\u2014'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Present Days</p>
                  <p className="text-lg font-bold">
                    {payroll.presentDays ?? '\u2014'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Loss of Pay Days
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {payroll.lopDays ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Pay Factor
                  </p>
                  <p className="text-lg font-bold">
                    {payroll.workingDays
                      ? `${(((payroll.workingDays - (payroll.lopDays ?? 0)) / payroll.workingDays) * 100).toFixed(0)}%`
                      : '100%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Earnings + Deductions ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ComponentTable
            title="Earnings"
            components={earnings}
            variant="success"
          />
          <div className="space-y-4">
            {structuralDeductions.length > 0 && (
              <ComponentTable
                title="Deductions (Structure)"
                components={structuralDeductions}
                variant="danger"
              />
            )}
            <ComponentTable
              title="Statutory Deductions"
              components={statutoryDeductions}
              variant="danger"
            />
          </div>
        </div>

        {/* ── Net Pay Summary ── */}
        <Card className="border-2 border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Gross Pay</p>
                <p className="text-xl font-bold font-mono text-green-700">
                  {formatCurrency(grossPay)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Deductions
                </p>
                <p className="text-xl font-bold font-mono text-red-700">
                  {formatCurrency(totalDeductions)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Pay</p>
                <p className="text-2xl font-bold font-mono">
                  {formatCurrency(netPay)}
                </p>
              </div>
              {payroll.paymentMethod && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="text-lg font-medium capitalize">
                    {payroll.paymentMethod.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Employer Contributions (not deducted from employee) ── */}
        {(employerEpf > 0 || employerEsic > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Employer Contributions
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Paid by employer on top of gross pay. Not deducted from employee
                salary.
              </p>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Contribution
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employerEpf > 0 && (
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        EPF (Employer — 13% of Basic)
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatCurrency(employerEpf)}
                      </td>
                    </tr>
                  )}
                  {employerEsic > 0 && (
                    <tr className="border-b">
                      <td className="px-4 py-2">
                        ESIC (Employer — 3.25% of Gross)
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatCurrency(employerEsic)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-muted/30 font-semibold">
                    <td className="px-4 py-2">Total Employer Cost</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatCurrency(employerEpf + employerEsic)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* ── Cost-to-Company Summary ── */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Total Cost to Company (CTC)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gross Pay + Employer EPF + Employer ESIC
                </p>
              </div>
              <p className="text-2xl font-bold font-mono">
                {formatCurrency(totalCTC)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </FormPage>
  );
}
