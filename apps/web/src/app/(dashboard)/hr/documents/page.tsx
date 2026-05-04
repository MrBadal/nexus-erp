'use client';

import { useMemo, useState } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { useEmployees, type Employee } from '@/hooks/use-hr';
import {
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  downloadEmployeeDocument,
  useDeleteEmployeeDocument,
  useEmployeeDocuments,
  type EmployeeDocument,
  type EmployeeDocumentType,
} from '@/hooks/use-employee-documents';
import { formatDate } from '@/lib/utils';
import { UploadDialog } from './upload-dialog';

const TYPE_OPTIONS: Array<[EmployeeDocumentType | 'all', string]> = [
  ['all', 'All types'],
  ...(Object.entries(EMPLOYEE_DOCUMENT_TYPE_LABELS) as Array<
    [EmployeeDocumentType, string]
  >),
];

function formatBytes(bytes: number | null): string {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HrDocumentsPage() {
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<EmployeeDocumentType | 'all'>(
    'all',
  );

  const employeesQuery = useEmployees();
  const employees = (employeesQuery.data as Employee[] | undefined) ?? [];

  const docsQuery = useEmployeeDocuments({
    employeeId: employeeFilter === 'all' ? undefined : employeeFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const docs: EmployeeDocument[] = useMemo(
    () => docsQuery.data ?? [],
    [docsQuery.data],
  );

  const deleteDoc = useDeleteEmployeeDocument();

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    await deleteDoc.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Documents"
        subtitle="Manage offer letters, contracts, certificates, and other employee files."
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Documents' },
        ]}
        actions={<UploadDialog />}
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Employee
            </span>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((e) => {
                  const label =
                    e.name ||
                    `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() ||
                    e.email;
                  return (
                    <SelectItem key={e.id} value={e.id}>
                      {e.employeeId} — {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Type
            </span>
            <Select
              value={typeFilter}
              onValueChange={(v) =>
                setTypeFilter(v as EmployeeDocumentType | 'all')
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {docsQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading documents…
            </div>
          ) : docs.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-6 w-6" />
              No documents found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Document</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Size</th>
                    <th className="px-4 py-2">Expires</th>
                    <th className="px-4 py-2">Visible</th>
                    <th className="px-4 py-2">Uploaded</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        <div className="font-medium">
                          {d.employeeName ?? 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {d.employeeNumber ?? ''}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{d.name}</div>
                        {d.notes && (
                          <div className="text-xs text-muted-foreground">
                            {d.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary">
                          {EMPLOYEE_DOCUMENT_TYPE_LABELS[d.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {formatBytes(d.fileSize)}
                      </td>
                      <td className="px-4 py-2">
                        {d.expiresAt ? formatDate(d.expiresAt) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {d.visibleToEmployee ? (
                          <Badge variant="outline">Visible</Badge>
                        ) : (
                          <Badge variant="outline">Internal</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(d.uploadedAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              downloadEmployeeDocument({
                                fileUrl: d.fileUrl,
                                name: d.name,
                              })
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(d.id)}
                            disabled={deleteDoc.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
