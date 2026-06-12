'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, buildQueryString } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmployeeDocumentType =
  | 'offer_letter'
  | 'contract'
  | 'id_proof'
  | 'certificate'
  | 'payslip_archive'
  | 'resume'
  | 'aadhaar'
  | 'pan_card'
  | 'address_proof'
  | 'experience_letter'
  | 'other';

export const EMPLOYEE_DOCUMENT_TYPE_LABELS: Record<EmployeeDocumentType, string> = {
  offer_letter: 'Offer Letter',
  contract: 'Contract',
  id_proof: 'ID Proof',
  certificate: 'Certificate',
  payslip_archive: 'Payslip Archive',
  resume: 'Resume / CV',
  aadhaar: 'Aadhaar',
  pan_card: 'PAN Card',
  address_proof: 'Address Proof',
  experience_letter: 'Experience Letter',
  other: 'Other',
};

/** Document types an employee can upload themselves from the ESS portal. */
export const ESS_UPLOADABLE_DOCUMENT_TYPES: EmployeeDocumentType[] = [
  'resume',
  'aadhaar',
  'pan_card',
  'address_proof',
  'experience_letter',
  'certificate',
  'other',
];

export interface EmployeeDocument {
  id: string;
  tenantId: string;
  employeeId: string;
  type: EmployeeDocumentType;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  expiresAt: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
  visibleToEmployee: boolean;
  notes: string | null;
  // Enriched (HR-side list)
  employeeName?: string;
  employeeNumber?: string;
}

export interface MyEmployeeDocument {
  id: string;
  type: EmployeeDocumentType;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  expiresAt: string | null;
  uploadedAt: string;
  notes: string | null;
}

export interface CreateEmployeeDocumentInput {
  employeeId: string;
  type: EmployeeDocumentType;
  name: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiresAt?: string;
  visibleToEmployee?: boolean;
  notes?: string;
}

export type UpdateEmployeeDocumentInput = Partial<CreateEmployeeDocumentInput>;

export interface EmployeeDocumentListParams {
  employeeId?: string;
  type?: EmployeeDocumentType | string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// HR-side hooks
// ---------------------------------------------------------------------------

const HR_LIST_KEY = ['hr', 'employee-documents'] as const;

export function useEmployeeDocuments(params: EmployeeDocumentListParams = {}) {
  return useQuery({
    queryKey: [...HR_LIST_KEY, params],
    queryFn: () =>
      get<EmployeeDocument[]>(
        `/hr/employee-documents${buildQueryString({
          employeeId: params.employeeId ?? null,
          type: params.type ?? null,
          limit: params.limit ?? null,
          offset: params.offset ?? null,
        })}`,
      ),
  });
}

export function useEmployeeDocument(id: string | undefined) {
  return useQuery({
    queryKey: [...HR_LIST_KEY, id],
    queryFn: () => get<EmployeeDocument>(`/hr/employee-documents/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeDocumentInput) =>
      post<EmployeeDocument>('/hr/employee-documents', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HR_LIST_KEY });
    },
  });
}

export function useUpdateEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEmployeeDocumentInput;
    }) => put<EmployeeDocument>(`/hr/employee-documents/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HR_LIST_KEY });
    },
  });
}

export function useDeleteEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del<{ success: boolean }>(`/hr/employee-documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HR_LIST_KEY });
    },
  });
}

/** True when fileUrl is a GCS object path (`<tenantId>/<uuid>-<name>`) rather than a URL. */
export function isStoragePath(fileUrl: string): boolean {
  return !/^https?:\/\//i.test(fileUrl);
}

/**
 * Resolve a stored fileUrl to something a browser can open. External links
 * pass through unchanged; GCS object paths are exchanged for a short-lived
 * signed URL via GET /files/signed (requires hr:read).
 */
export async function resolveDocumentUrl(fileUrl: string): Promise<string> {
  if (!isStoragePath(fileUrl)) return fileUrl;
  const res = await get<{ url: string }>(
    `/files/signed?path=${encodeURIComponent(fileUrl)}`,
  );
  return res.url;
}

/**
 * Trigger an HR-side download/open of a document. GCS-stored documents are
 * resolved to a signed URL first; external links open directly.
 */
export async function downloadEmployeeDocument(doc: { fileUrl: string; name: string }) {
  if (typeof window === 'undefined') return;
  const href = await resolveDocumentUrl(doc.fileUrl);
  const a = document.createElement('a');
  a.href = href;
  a.download = doc.name;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ---------------------------------------------------------------------------
// ESS-side hooks
// ---------------------------------------------------------------------------

const ESS_LIST_KEY = ['ess', 'documents'] as const;

export function useMyDocuments() {
  return useQuery({
    queryKey: ESS_LIST_KEY,
    queryFn: () => get<MyEmployeeDocument[]>('/ess/documents'),
  });
}

/** Employee uploads their own personal document (resume, ID proof, etc.). */
export function useUploadMyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: EmployeeDocumentType;
      name: string;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
      expiresAt?: string;
      notes?: string;
    }) => post<MyEmployeeDocument>('/ess/documents', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESS_LIST_KEY }),
  });
}

/**
 * Initiates a download from the ESS-side endpoint. The endpoint returns
 * `{ url }` — a signed GCS URL (with attachment disposition) for stored
 * documents, or the original external link. We navigate the browser to it
 * directly, which avoids CORS issues that a cross-origin blob fetch would hit.
 */
export async function downloadMyDocument(id: string, filename: string) {
  if (typeof window === 'undefined') return;
  const res = await get<{ url: string }>(`/ess/documents/${id}/download`);
  const a = document.createElement('a');
  a.href = res.url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
