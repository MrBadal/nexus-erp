'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployees, type Employee } from '@/hooks/use-hr';
import {
  EMPLOYEE_DOCUMENT_TYPE_LABELS,
  useCreateEmployeeDocument,
  type EmployeeDocumentType,
} from '@/hooks/use-employee-documents';

const TYPE_OPTIONS = Object.entries(EMPLOYEE_DOCUMENT_TYPE_LABELS) as Array<
  [EmployeeDocumentType, string]
>;

interface UploadDialogProps {
  trigger?: React.ReactNode;
  defaultEmployeeId?: string;
}

export function UploadDialog({ trigger, defaultEmployeeId }: UploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? '');
  const [type, setType] = useState<EmployeeDocumentType>('other');
  const [name, setName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [mimeType, setMimeType] = useState<string>('');
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [expiresAt, setExpiresAt] = useState('');
  const [visibleToEmployee, setVisibleToEmployee] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const employeesQuery = useEmployees();
  const create = useCreateEmployeeDocument();

  const employees = (employeesQuery.data as Employee[] | undefined) ?? [];

  const reset = () => {
    setEmployeeId(defaultEmployeeId ?? '');
    setType('other');
    setName('');
    setFileUrl('');
    setMimeType('');
    setFileSize(undefined);
    setExpiresAt('');
    setVisibleToEmployee(true);
    setNotes('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!employeeId) {
      setError('Select an employee.');
      return;
    }
    if (!fileUrl) {
      setError('Upload a file or paste a file URL.');
      return;
    }
    try {
      await create.mutateAsync({
        employeeId,
        type,
        name: name || 'Document',
        fileUrl,
        mimeType: mimeType || undefined,
        fileSize,
        expiresAt: expiresAt || undefined,
        visibleToEmployee,
        notes: notes || undefined,
      });
      reset();
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload document';
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Upload Document</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Employee Document</DialogTitle>
            <DialogDescription>
              Attach a document to an employee record. Mark it visible to allow
              the employee to download it from their ESS portal.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ed-employee">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id="ed-employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
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

            <div className="grid gap-2">
              <Label htmlFor="ed-type">Document Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as EmployeeDocumentType)}
              >
                <SelectTrigger id="ed-type">
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

            <div className="grid gap-2">
              <Label htmlFor="ed-name">Document Name</Label>
              <Input
                id="ed-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Offer Letter — June 2025"
              />
            </div>

            <div className="grid gap-2">
              <Label>File</Label>
              <FileUpload
                endpoint="/files/upload/document"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,.doc,.docx"
                maxSizeMb={10}
                label="Upload file"
                onUploaded={(res) => setFileUrl(res.path ?? res.url ?? '')}
              />
              <Input
                id="ed-url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="…or paste an external link (https://...)"
              />
              <p className="text-xs text-muted-foreground">
                Upload directly to secure cloud storage, or paste an external
                URL as a fallback.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ed-expires">Expires On</Label>
                <Input
                  id="ed-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={visibleToEmployee}
                    onCheckedChange={(v) => setVisibleToEmployee(Boolean(v))}
                  />
                  Visible to employee
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ed-notes">Notes</Label>
              <Textarea
                id="ed-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
