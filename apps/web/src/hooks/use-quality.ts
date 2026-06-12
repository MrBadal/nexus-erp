'use client';

import { createCrudHooks, createStatusActionHook } from './create-crud-hooks';
import { endpoints } from '@/lib/api';

// ─── Quality Inspections ────────────────────────────────────────────────────

const inspectionHooks = createCrudHooks('qualityInspections', {
  list: endpoints.qualityInspections.list,
  get: (id: string) => endpoints.qualityInspections.get(id),
  create: endpoints.qualityInspections.create,
  update: (id: string) => endpoints.qualityInspections.update(id),
  delete: (id: string) => endpoints.qualityInspections.delete(id),
});

export const useQualityInspections = inspectionHooks.useList;
export const useQualityInspection = inspectionHooks.useById;
export const useCreateQualityInspection = inspectionHooks.useCreate;
export const useUpdateQualityInspection = inspectionHooks.useUpdate;
export const useDeleteQualityInspection = inspectionHooks.useDelete;

export const useAcceptInspection = createStatusActionHook('qualityInspections', 'accept', (id) => endpoints.qualityInspections.accept(id));
export const useRejectInspection = createStatusActionHook('qualityInspections', 'reject', (id) => endpoints.qualityInspections.reject(id));

// ─── Quality Procedures ─────────────────────────────────────────────────────

const procedureHooks = createCrudHooks('qualityProcedures', {
  list: endpoints.qualityProcedures.list,
  get: (id: string) => endpoints.qualityProcedures.get(id),
  create: endpoints.qualityProcedures.create,
  update: (id: string) => endpoints.qualityProcedures.update(id),
  delete: (id: string) => endpoints.qualityProcedures.delete(id),
});

export const useQualityProcedures = procedureHooks.useList;
export const useQualityProcedure = procedureHooks.useById;
export const useCreateQualityProcedure = procedureHooks.useCreate;
export const useUpdateQualityProcedure = procedureHooks.useUpdate;
export const useDeleteQualityProcedure = procedureHooks.useDelete;

// ─── Non-Conformance Reports ────────────────────────────────────────────────

const ncrHooks = createCrudHooks('ncr', {
  list: endpoints.ncr.list,
  get: (id: string) => endpoints.ncr.get(id),
  create: endpoints.ncr.create,
  update: (id: string) => endpoints.ncr.update(id),
  delete: (id: string) => endpoints.ncr.delete(id),
});

export const useNcrs = ncrHooks.useList;
export const useNcr = ncrHooks.useById;
export const useCreateNcr = ncrHooks.useCreate;
export const useUpdateNcr = ncrHooks.useUpdate;
export const useDeleteNcr = ncrHooks.useDelete;

export const useCloseNcr = createStatusActionHook('ncr', 'close', (id) => endpoints.ncr.close(id));
