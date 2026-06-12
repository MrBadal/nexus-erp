'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { InlineGrid, type InlineGridColumn, type InlineGridFooterItem } from '@/components/ui/inline-grid';
import { useCreateJournalEntry, usePostJournalEntry } from '@/hooks/use-journal-entries';
import { useAccounts } from '@/hooks/use-accounts';
import { apiErrorMessage } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineRow {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  [key: string]: unknown;
}

function emptyLine(): LineRow {
  return { accountId: '', description: '', debit: 0, credit: 0 };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewJournalEntryPage() {
  const router = useRouter();
  const { data: accounts } = useAccounts();
  const createMutation = useCreateJournalEntry();
  const postMutation = usePostJournalEntry();

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineRow[]>([emptyLine(), emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Account options
  const accountOptions = useMemo(
    () =>
      (accounts ?? [])
        .filter((a) => a.isActive && !a.isHeader)
        .map((a) => ({
          label: `${a.code} - ${a.name}`,
          value: a.id,
        })),
    [accounts],
  );

  // Grid columns
  const gridColumns: InlineGridColumn<LineRow>[] = useMemo(
    () => [
      {
        key: 'accountId',
        header: 'Account',
        type: 'select',
        options: accountOptions,
        required: true,
        width: '2fr',
        placeholder: 'Select account',
      },
      {
        key: 'description',
        header: 'Description',
        type: 'text',
        width: '2fr',
        placeholder: 'Line description',
      },
      {
        key: 'debit',
        header: 'Debit',
        type: 'currency',
        width: '1fr',
        align: 'right',
      },
      {
        key: 'credit',
        header: 'Credit',
        type: 'currency',
        width: '1fr',
        align: 'right',
      },
    ],
    [accountOptions],
  );

  // Totals
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);

  const footerItems: InlineGridFooterItem[] = [
    { label: 'Total Debit', value: totalDebit },
    { label: 'Total Credit', value: totalCredit },
    {
      label: 'Difference',
      value: difference,
      variant: difference !== 0 ? 'danger' : 'success',
    },
  ];

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (lines.length < 2) {
      newErrors.lines = 'At least 2 journal lines are required';
    }

    // Check each line
    const lineErrors: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId) {
        lineErrors.push(`Line ${i + 1}: Account is required`);
      }
      if (line.debit === 0 && line.credit === 0) {
        lineErrors.push(`Line ${i + 1}: Must have a debit or credit amount`);
      }
      if (line.debit > 0 && line.credit > 0) {
        lineErrors.push(`Line ${i + 1}: Cannot have both debit and credit`);
      }
    }
    if (lineErrors.length > 0) {
      newErrors.lines = lineErrors.join('; ');
    }

    // Balance check
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      newErrors.balance = 'Total debits must equal total credits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [description, lines, totalDebit, totalCredit]);

  // Build payload
  const buildPayload = useCallback(() => {
    return {
      date: date.toISOString().split('T')[0],
      reference: reference || null,
      description: description || null,
      lines: lines.map((l, i) => ({
        lineNumber: i + 1,
        accountId: l.accountId,
        description: l.description || null,
        debitAmount: String(l.debit || 0),
        creditAmount: String(l.credit || 0),
      })),
    };
  }, [date, reference, description, lines]);

  // Save as Draft
  const handleSaveDraft = useCallback(async () => {
    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }
    try {
      const result = await createMutation.mutateAsync(buildPayload());
      toast.success('Journal entry saved as draft');
      if (result?.id) {
        router.push(`/finance/journal-entries/${result.id}`);
      } else {
        router.push('/finance/journal-entries');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create journal entry'));
    }
  }, [validate, buildPayload, createMutation, router]);

  // Save & Post
  const handleSaveAndPost = useCallback(async () => {
    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }
    try {
      const result = await createMutation.mutateAsync(buildPayload());
      if (result?.id) {
        await postMutation.mutateAsync(result.id);
        toast.success('Journal entry created and posted');
        router.push(`/finance/journal-entries/${result.id}`);
      } else {
        toast.success('Journal entry created');
        router.push('/finance/journal-entries');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create and post journal entry'));
    }
  }, [validate, buildPayload, createMutation, postMutation, router]);

  const handleCancel = useCallback(() => {
    router.push('/finance/journal-entries');
  }, [router]);

  const handleAddLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const handleRemoveLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <FormPage
      title="New Journal Entry"
      breadcrumbs={[
        { label: 'Finance', href: '/finance' },
        { label: 'Journal Entries', href: '/finance/journal-entries' },
        { label: 'New Entry' },
      ]}
      backHref="/finance/journal-entries"
      primaryAction={{
        label: 'Save as Draft',
        onClick: handleSaveDraft,
        loading: createMutation.isPending,
      }}
      secondaryActions={[
        {
          label: 'Save & Post',
          onClick: handleSaveAndPost,
          variant: 'outline',
          disabled: createMutation.isPending || postMutation.isPending,
        },
        {
          label: 'Cancel',
          onClick: handleCancel,
          variant: 'ghost',
        },
      ]}
    >
      <div className="space-y-6">
        {/* Entry Details */}
        <FormSection title="Entry Details" columns={2}>
          <FormField label="Date" required>
            <DatePicker value={date} onChange={(d) => setDate(d)} />
          </FormField>
          <FormField label="Reference">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional reference number"
            />
          </FormField>
          <FormField
            label="Description"
            required
            error={errors.description}
            className="md:col-span-2"
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this journal entry"
              rows={3}
            />
          </FormField>
        </FormSection>

        {/* Journal Lines */}
        <FormSection title="Journal Lines" columns={1} collapsible={false}>
          {errors.lines && (
            <p className="text-xs text-destructive mb-2">{errors.lines}</p>
          )}
          {errors.balance && (
            <p className="text-xs text-destructive mb-2">{errors.balance}</p>
          )}
          <InlineGrid<LineRow>
            columns={gridColumns}
            rows={lines}
            onChange={(rows) => setLines(rows as LineRow[])}
            onAddRow={handleAddLine}
            onRemoveRow={handleRemoveLine}
            footer={footerItems}
            minRows={2}
            addRowLabel="+ Add Line"
          />
        </FormSection>
      </div>
    </FormPage>
  );
}
