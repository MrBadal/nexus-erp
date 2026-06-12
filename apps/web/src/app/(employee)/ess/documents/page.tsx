'use client';

import { useState } from 'react';
import { Download, FileText, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  ESS_UPLOADABLE_DOCUMENT_TYPES,
  downloadMyDocument,
  useMyDocuments,
  useUploadMyDocument,
  type EmployeeDocumentType,
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
  const { data, isLoading } = useMyDocuments();
  const uploadMutation = useUploadMyDocument();

  // Upload form state — files are uploaded directly to Google Cloud Storage
  // via /ess/files/upload-document, which fills `fileUrl` with the stored
  // object path. Pasting an external URL remains available as a fallback.
  const [uploadForm, setUploadForm] = useState<{
    type: EmployeeDocumentType;
    name: string;
    fileUrl: string;
    notes: string;
  }>({ type: 'resume', name: '', fileUrl: '', notes: '' });

  const docs = data ?? [];

  const handleDownload = async (id: string, name: string) => {
    setDownloadingId(id);
    try {
      await downloadMyDocument(id, name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.name.trim() || !uploadForm.fileUrl.trim()) {
      toast.error('Document name and file URL are required');
      return;
    }
    uploadMutation.mutate(
      {
        type: uploadForm.type,
        name: uploadForm.name.trim(),
        fileUrl: uploadForm.fileUrl.trim(),
        notes: uploadForm.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Document uploaded');
          setUploadForm({ type: 'resume', name: '', fileUrl: '', notes: '' });
        },
        onError: (err: Error) =>
          toast.error(err.message || 'Failed to upload document'),
      },
    );
  };

  const resumes = docs.filter((d) => d.type === 'resume');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Documents</h1>
        <p className="text-sm text-muted-foreground">
          View documents shared by HR (offer letter, contract, payslips), and
          upload your own (resume, ID proofs, certificates).
        </p>
      </div>

      {/* ─── Upload section ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Upload a personal document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select
                value={uploadForm.type}
                onValueChange={(v) =>
                  setUploadForm((f) => ({ ...f, type: v as EmployeeDocumentType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESS_UPLOADABLE_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {EMPLOYEE_DOCUMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Riya Sharma — Resume Mar 2026"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>File *</Label>
              <FileUpload
                endpoint="/ess/files/upload-document"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.doc,.docx"
                maxSizeMb={10}
                label="Choose & upload file"
                onUploaded={(res) =>
                  setUploadForm((f) => ({
                    ...f,
                    fileUrl: res.path ?? res.url ?? '',
                  }))
                }
              />
              <Input
                value={uploadForm.fileUrl}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, fileUrl: e.target.value }))
                }
                placeholder="…or paste an external link (https://...)"
              />
              <p className="text-xs text-muted-foreground">
                Upload your file directly (stored securely), or paste an
                external link as a fallback. Then press &quot;Upload
                document&quot; below to save it.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={uploadForm.notes}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Anything HR should know about this document"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={uploadMutation.isPending}>
                <Upload className="mr-2 h-4 w-4" />
                {uploadMutation.isPending ? 'Uploading…' : 'Upload document'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── Resume quick view ─── */}
      {resumes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Your latest resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{resumes[0].name}</div>
                <div className="text-xs text-muted-foreground">
                  Uploaded {formatDate(resumes[0].uploadedAt)} · {formatBytes(resumes[0].fileSize)}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(resumes[0].id, resumes[0].name)}
                disabled={downloadingId === resumes[0].id}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                {downloadingId === resumes[0].id ? 'Downloading…' : 'Download'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── All documents table ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : docs.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-6 w-6" />
              No documents yet. Upload your resume above to get started.
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
                          {EMPLOYEE_DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {formatBytes(d.fileSize)}
                      </td>
                      <td className="px-4 py-2">
                        {d.expiresAt ? formatDate(d.expiresAt) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {d.uploadedAt ? formatDate(d.uploadedAt) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(d.id, d.name)}
                          disabled={downloadingId === d.id}
                        >
                          <Download className="mr-2 h-3.5 w-3.5" />
                          {downloadingId === d.id ? 'Downloading…' : 'Download'}
                        </Button>
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
