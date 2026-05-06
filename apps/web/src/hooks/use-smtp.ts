'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints } from '@/lib/api';

export interface SmtpSettings {
  id?: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName?: string | null;
  replyTo?: string | null;
  enabled: boolean;
  passwordSet?: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
  lastTestError?: string | null;
  configured?: false;
}

export interface SmtpUpsertInput {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  enabled?: boolean;
}

export function useSmtpSettings() {
  return useQuery<SmtpSettings>({
    queryKey: ['smtp-settings'],
    queryFn: () => get<SmtpSettings>(endpoints.smtp.get),
  });
}

export function useSaveSmtpSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SmtpUpsertInput) =>
      put<SmtpSettings>(endpoints.smtp.upsert, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smtp-settings'] }),
  });
}

export function useDeleteSmtpSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => del<{ message: string }>(endpoints.smtp.delete),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smtp-settings'] }),
  });
}

export function useTestSmtpConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      post<{ ok: boolean; error?: string }>(endpoints.smtp.testConnection),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smtp-settings'] }),
  });
}

export function useTestSendSmtp() {
  return useMutation({
    mutationFn: (to: string) =>
      post<{ sent: boolean; skipped?: boolean; error?: string }>(
        endpoints.smtp.testSend,
        { to },
      ),
  });
}
