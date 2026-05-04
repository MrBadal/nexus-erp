'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  downloadMyDocument,
  useMyDocuments,
} from '@/hooks/use-employee-documents';
import { formatDate } from '@/lib/utils';

function formatBytes(bytes: number | null): string {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EssDocumentsPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useMyDocuments();

  const docs = data ?? [];

  const handleDownload = async (id: string, name: string) => {
    setError(null);
    setDownloadingId(id);
    try {
      await downloadMyDocument(id, name);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to download document';
      setError(message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Documents</h1>
        <p className="text-sm text-muted-foreground">
          View and download documents shared with you by HR.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : docs.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-6 w-6" />
              No documents are available for download yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-2">Document</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Size</th>
                    <th className="px-4 py-2">Expires</th>
                    <th className="px-4 py-2">Uploaded</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
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
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(d.uploadedAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={downloadingId === d.id}
                          onClick={() => handleDownload(d.id, d.name)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          {downloadingId === d.id ? 'Downloading…' : 'Download'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {error && (
            <p className="px-4 py-2 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
