'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText, Check, AlertTriangle } from 'lucide-react';
import { post, endpoints } from '@/lib/api';

const entities = [
  { value: 'items', label: 'Inventory Items' },
  { value: 'employees', label: 'Employees' },
  { value: 'contacts', label: 'CRM Contacts' },
  { value: 'accounts', label: 'Chart of Accounts' },
];

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

export default function ImportExportPage() {
  const [selectedEntity, setSelectedEntity] = useState('items');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [csvContent, setCsvContent] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      const lines = content.split('\n').slice(0, 6);
      setCsvPreview(lines);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await post<ImportResult>(endpoints.importExport.import, {
        entity: selectedEntity,
        csvContent,
      });
      setImportResult(result);
    } catch (err) {
      setImportResult({ total: 0, imported: 0, skipped: 0, errors: [{ row: 0, error: 'Import failed' }] });
    }
    setImporting(false);
  };

  const handleExport = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}${endpoints.importExport.export(selectedEntity)}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('nexus_access_token') : null;

    const a = document.createElement('a');
    // Use fetch to include auth header
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': (() => {
          try { return JSON.parse(localStorage.getItem('nexus_tenant') || '{}').id || ''; } catch { return ''; }
        })(),
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = `${selectedEntity}_export.csv`;
        a.click();
        URL.revokeObjectURL(objectUrl);
      });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Import / Export</h1>
        <p className="text-sm text-muted-foreground">Bulk import data via CSV or export existing data</p>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Select Entity</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {entities.map((e) => (
            <button
              key={e.value}
              onClick={() => { setSelectedEntity(e.value); setCsvPreview([]); setCsvContent(''); setImportResult(null); }}
              className={`rounded-lg border p-3 text-sm text-center transition-colors ${
                selectedEntity === e.value
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'hover:bg-muted'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Import */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import
          </h2>
          <p className="text-sm text-muted-foreground">Upload a CSV file to bulk-import {entities.find((e) => e.value === selectedEntity)?.label}.</p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileText className="mr-1 h-3.5 w-3.5" /> Choose CSV File
          </Button>

          {csvPreview.length > 0 && (
            <div className="rounded border bg-muted/50 p-2 overflow-x-auto">
              <p className="text-xs font-medium mb-1">Preview (first {csvPreview.length} rows):</p>
              {csvPreview.map((line, i) => (
                <p key={i} className="text-xs font-mono truncate">{line}</p>
              ))}
            </div>
          )}

          {csvContent && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? 'Importing...' : 'Start Import'}
            </Button>
          )}

          {importResult && (
            <div className={`rounded-lg border p-3 ${importResult.errors.length > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {importResult.errors.length === 0 ? (
                  <><Check className="h-4 w-4 text-green-600" /> Import successful</>
                ) : (
                  <><AlertTriangle className="h-4 w-4 text-yellow-600" /> Import completed with issues</>
                )}
              </div>
              <p className="text-xs mt-1">
                {importResult.imported} imported, {importResult.skipped} skipped out of {importResult.total} rows
              </p>
              {importResult.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                  {importResult.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-red-600">Row {e.row}: {e.error}</p>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p className="text-muted-foreground">...and {importResult.errors.length - 10} more errors</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Download className="h-4 w-4" /> Export
          </h2>
          <p className="text-sm text-muted-foreground">
            Download all {entities.find((e) => e.value === selectedEntity)?.label} data as a CSV file.
          </p>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-1 h-3.5 w-3.5" /> Download CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
