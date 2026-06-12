'use client';

import { useRef, useState } from 'react';
import { Loader2, Paperclip, Upload } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';

export interface FileUploadResult {
  /** Permanent public URL (public-bucket uploads) or signed preview URL (private). */
  url?: string;
  /** Object path in the private bucket — store this for private documents. */
  path?: string;
}

interface FileUploadProps {
  /** Called with the upload response on success. */
  onUploaded: (res: FileUploadResult) => void;
  /** API endpoint to POST the multipart form to, e.g. '/files/upload/document'. */
  endpoint: string;
  /** Accept attribute for the file picker, e.g. 'image/*,.pdf,.doc,.docx'. */
  accept: string;
  /** Client-side size guard (server enforces its own limit too). */
  maxSizeMb: number;
  label?: string;
}

/**
 * Reusable direct-to-API file upload control. Posts multipart FormData
 * (field name 'file') through the shared axios client, which attaches the
 * auth token and tenant header. Shows progress while uploading and calls
 * `onUploaded` with the server's `{ url?, path? }` response.
 */
export function FileUpload({
  onUploaded,
  endpoint,
  accept,
  maxSizeMb,
  label = 'Upload file',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File is too large — maximum size is ${maxSizeMb}MB`);
      return;
    }
    setUploading(true);
    setProgress(0);
    setFileName(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // large files on slow links need more than the 30s default
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });
      // Endpoints return { url?, path? } directly; tolerate a { data: ... } wrapper.
      const raw = response.data as
        | FileUploadResult
        | { data: FileUploadResult };
      const result: FileUploadResult =
        raw && typeof raw === 'object' && 'data' in raw
          ? (raw as { data: FileUploadResult }).data
          : (raw as FileUploadResult);
      toast.success('File uploaded');
      onUploaded(result);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to upload file'));
      setFileName(null);
    } finally {
      setUploading(false);
      setProgress(0);
      // Allow re-selecting the same file.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Uploading… {progress > 0 ? `${progress}%` : ''}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-3.5 w-3.5" />
            {label}
          </>
        )}
      </Button>
      {fileName && !uploading && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Paperclip className="h-3 w-3" />
          {fileName}
        </span>
      )}
      <span className="text-[11px] text-muted-foreground">
        Max {maxSizeMb}MB
      </span>
    </div>
  );
}
