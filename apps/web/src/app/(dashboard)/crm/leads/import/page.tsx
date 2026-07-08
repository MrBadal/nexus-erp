'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useImportLeads,
  type ImportLeadRow,
  type ImportResult,
} from '@/hooks/use-crm';
import { useUsers, useRoles } from '@/hooks/use-settings';
import { apiErrorMessage } from '@/lib/api';

// Columns accepted by the importer, in template order.
const TEMPLATE_COLUMNS = [
  'name',
  'phone',
  'email',
  'company',
  'jobTitle',
  'source',
  'priority',
  'notes',
  'city',
  'state',
] as const;

type ColumnKey = (typeof TEMPLATE_COLUMNS)[number];

// Header aliases (lower-cased, spaces/underscores stripped) → canonical column.
const HEADER_ALIASES: Record<string, ColumnKey> = {
  name: 'name',
  fullname: 'name',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  email: 'email',
  emailaddress: 'email',
  company: 'company',
  organisation: 'company',
  organization: 'company',
  jobtitle: 'jobTitle',
  title: 'jobTitle',
  designation: 'jobTitle',
  source: 'source',
  priority: 'priority',
  notes: 'notes',
  note: 'notes',
  city: 'city',
  state: 'state',
};

const UNASSIGNED = '__unassigned__';
const ROUND_ROBIN = '__round_robin__';

interface ParsedRow extends ImportLeadRow {
  __row: number;
  __errors: string[];
}

/**
 * Minimal but robust CSV parser: handles quoted fields, escaped quotes (""),
 * commas inside quotes, and both LF and CRLF line endings. Returns rows of cells.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Flush trailing field/row.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function digitsOnly(v: string | undefined): string {
  return (v ?? '').replace(/\D/g, '');
}

function validateRow(r: ImportLeadRow): string[] {
  const errors: string[] = [];
  if (!r.name || !r.name.trim()) errors.push('Name is required');
  if (!r.phone || !r.phone.trim()) {
    errors.push('Phone is required');
  } else if (digitsOnly(r.phone).length < 8) {
    errors.push('Phone must have at least 8 digits');
  }
  return errors;
}

/** Map a parsed CSV grid into typed rows. Detects a header row by aliases. */
function mapRows(grid: string[][]): ParsedRow[] {
  if (grid.length === 0) return [];

  const first = grid[0].map((c) => c.trim().toLowerCase().replace(/[\s_]/g, ''));
  const headerMatches = first.filter((c) => c in HEADER_ALIASES).length;
  const hasHeader = headerMatches >= 2;

  let columns: (ColumnKey | null)[];
  let dataRows: string[][];

  if (hasHeader) {
    columns = first.map((c) => HEADER_ALIASES[c] ?? null);
    dataRows = grid.slice(1);
  } else {
    // Header-less paste: map by position to the template order.
    columns = TEMPLATE_COLUMNS.map((c) => c);
    dataRows = grid;
  }

  return dataRows.map((cells, idx) => {
    const record: ImportLeadRow = {};
    columns.forEach((col, ci) => {
      if (!col) return;
      const val = (cells[ci] ?? '').trim();
      if (val) record[col] = val;
    });
    return {
      ...record,
      __row: idx + 1,
      __errors: validateRow(record),
    };
  });
}

export default function ImportLeadsPage() {
  const importLeads = useImportLeads();
  const { data: users } = useUsers();
  const { data: roles } = useRoles();

  const [rawText, setRawText] = useState('');
  const [assignTo, setAssignTo] = useState<string>(UNASSIGNED);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo<ParsedRow[]>(() => {
    if (!rawText.trim()) return [];
    return mapRows(parseCsv(rawText));
  }, [rawText]);

  const validRows = useMemo(() => parsed.filter((r) => r.__errors.length === 0), [parsed]);
  const invalidCount = parsed.length - validRows.length;

  // Telecaller users, derived by mapping roleId → role slug 'telecaller'.
  const telecallers = useMemo(() => {
    const telecallerRoleIds = new Set(
      (roles ?? []).filter((r) => r.slug === 'telecaller').map((r) => r.id),
    );
    return (users ?? []).filter((u) => u.roleId && telecallerRoleIds.has(u.roleId));
  }, [users, roles]);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setRawText(String(reader.result ?? ''));
    reader.onerror = () => toast.error('Could not read that file');
    reader.readAsText(file);
  }, []);

  const downloadTemplate = useCallback(() => {
    const header = TEMPLATE_COLUMNS.join(',');
    const example =
      'Jane Doe,+1 555 123 4567,jane@example.com,Acme Inc,Purchasing Manager,cold_call,high,"Met at trade show, follow up",Mumbai,Maharashtra';
    const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const resolveAssignTo = (): string | null | 'round_robin' => {
    if (assignTo === UNASSIGNED) return null;
    if (assignTo === ROUND_ROBIN) return 'round_robin';
    return assignTo;
  };

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    const leads: ImportLeadRow[] = validRows.map((r) => ({
      name: r.name,
      phone: r.phone,
      email: r.email,
      company: r.company,
      jobTitle: r.jobTitle,
      source: r.source,
      priority: r.priority,
      notes: r.notes,
      city: r.city,
      state: r.state,
    }));
    try {
      const res = await importLeads.mutateAsync({ leads, assignTo: resolveAssignTo() });
      setResult(res);
      toast.success(`Imported ${res.created} lead${res.created === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Import failed'));
    }
  };

  const reset = () => {
    setRawText('');
    setFileName(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Result view ────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Link href="/crm/work-queue">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Import complete</h1>
        </div>

        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">Submitted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped (duplicates)</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {result.errors.length} row{result.errors.length === 1 ? '' : 's'} could not be
                imported
              </p>
              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{e.row}</td>
                        <td className="px-3 py-2">{e.name || '—'}</td>
                        <td className="px-3 py-2 text-destructive">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={reset}>Import another file</Button>
            <Link href="/crm/work-queue">
              <Button variant="outline">Go to Work Queue</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ── Import form ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/crm/work-queue">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Import Leads</h1>
          <p className="text-sm text-muted-foreground">
            Bulk-load leads from a CSV file or by pasting rows from a spreadsheet.
          </p>
        </div>
      </div>

      {/* Instructions */}
      <Card className="space-y-3 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Accepted columns</h2>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-1.5 h-4 w-4" /> Download template
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Include a header row with any of these columns (order and case do not matter).
          <span className="font-medium text-foreground"> name</span> and
          <span className="font-medium text-foreground"> phone</span> are required.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_COLUMNS.map((c) => (
            <code
              key={c}
              className={`rounded px-2 py-0.5 text-xs ${
                c === 'name' || c === 'phone'
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {c}
            </code>
          ))}
        </div>
      </Card>

      {/* Input */}
      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <Label>Upload a CSV file</Label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          {fileName && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {fileName}
            </p>
          )}
        </div>

        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or paste rows</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <Label>Paste from Excel / Google Sheets</Label>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setFileName(null);
            }}
            placeholder="name,phone,email,company,...&#10;Jane Doe,+1 555 123 4567,jane@example.com,Acme Inc,..."
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </Card>

      {/* Preview */}
      {parsed.length > 0 && (
        <Card className="space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Preview</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{parsed.length} rows</span>
              {invalidCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  {invalidCount} invalid
                </span>
              )}
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                {validRows.length} ready
              </span>
            </div>
          </div>

          <div className="max-h-96 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Issue</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 50).map((r) => {
                  const invalid = r.__errors.length > 0;
                  return (
                    <tr
                      key={r.__row}
                      className={`border-t ${invalid ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{r.__row}</td>
                      <td className="px-3 py-2">{r.name || '—'}</td>
                      <td className="px-3 py-2">{r.phone || '—'}</td>
                      <td className="px-3 py-2">{r.company || '—'}</td>
                      <td className="px-3 py-2">{r.email || '—'}</td>
                      <td className="px-3 py-2 text-xs text-destructive">
                        {r.__errors.join('; ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {parsed.length > 50 && (
            <p className="text-xs text-muted-foreground">
              Showing first 50 of {parsed.length} rows. All valid rows will be imported.
            </p>
          )}
        </Card>
      )}

      {/* Assign + import */}
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-xs space-y-1.5">
          <Label>Assign imported leads to</Label>
          <Select value={assignTo} onValueChange={setAssignTo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned pool (claimable)</SelectItem>
              <SelectItem value={ROUND_ROBIN}>Round-robin across telecallers</SelectItem>
              {telecallers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {`${u.firstName} ${u.lastName}`.trim() || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="lg"
          onClick={handleImport}
          disabled={importLeads.isPending || validRows.length === 0}
        >
          <Upload className="mr-1.5 h-4 w-4" />
          {importLeads.isPending
            ? 'Importing…'
            : `Import ${validRows.length} lead${validRows.length === 1 ? '' : 's'}`}
        </Button>
      </Card>
    </div>
  );
}
