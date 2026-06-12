'use client';

import { createCrudHooks, createStatusActionHook } from './create-crud-hooks';
import { endpoints } from '@/lib/api';

// ─── BOMs ───────────────────────────────────────────────────────────────────

const bomHooks = createCrudHooks('boms', {
  list: endpoints.boms.list,
  get: (id: string) => endpoints.boms.get(id),
  create: endpoints.boms.create,
  update: (id: string) => endpoints.boms.update(id),
  delete: (id: string) => endpoints.boms.delete(id),
});

export const useBoms = bomHooks.useList;
export const useBom = bomHooks.useById;
export const useCreateBom = bomHooks.useCreate;
export const useUpdateBom = bomHooks.useUpdate;
export const useDeleteBom = bomHooks.useDelete;

export const useActivateBom = createStatusActionHook('boms', 'activate', (id) => endpoints.boms.activate(id));
export const useDeactivateBom = createStatusActionHook('boms', 'deactivate', (id) => endpoints.boms.deactivate(id));

// ─── Work Orders ────────────────────────────────────────────────────────────

const workOrderHooks = createCrudHooks('workOrders', {
  list: endpoints.workOrders.list,
  get: (id: string) => endpoints.workOrders.get(id),
  create: endpoints.workOrders.create,
  update: (id: string) => endpoints.workOrders.update(id),
  delete: (id: string) => endpoints.workOrders.delete(id),
});

export const useWorkOrders = workOrderHooks.useList;
export const useWorkOrder = workOrderHooks.useById;
export const useCreateWorkOrder = workOrderHooks.useCreate;
export const useUpdateWorkOrder = workOrderHooks.useUpdate;
export const useDeleteWorkOrder = workOrderHooks.useDelete;

export const useStartWorkOrder = createStatusActionHook('workOrders', 'start', (id) => endpoints.workOrders.start(id));
export const useCompleteWorkOrder = createStatusActionHook('workOrders', 'complete', (id) => endpoints.workOrders.complete(id));
export const useStopWorkOrder = createStatusActionHook('workOrders', 'stop', (id) => endpoints.workOrders.stop(id));
export const useCancelWorkOrder = createStatusActionHook('workOrders', 'cancel', (id) => endpoints.workOrders.cancel(id));

// ─── Workstations ───────────────────────────────────────────────────────────

const workstationHooks = createCrudHooks('workstations', {
  list: endpoints.workstations.list,
  get: (id: string) => endpoints.workstations.get(id),
  create: endpoints.workstations.create,
  update: (id: string) => endpoints.workstations.update(id),
  delete: (id: string) => endpoints.workstations.delete(id),
});

export const useWorkstations = workstationHooks.useList;
export const useWorkstation = workstationHooks.useById;
export const useCreateWorkstation = workstationHooks.useCreate;
export const useUpdateWorkstation = workstationHooks.useUpdate;
export const useDeleteWorkstation = workstationHooks.useDelete;
