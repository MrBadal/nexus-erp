'use client';

import { createCrudHooks, createStatusActionHook } from './create-crud-hooks';
import { endpoints } from '@/lib/api';

// ─── Assets ─────────────────────────────────────────────────────────────────

const assetHooks = createCrudHooks('assets', {
  list: endpoints.assets.list,
  get: (id: string) => endpoints.assets.get(id),
  create: endpoints.assets.create,
  update: (id: string) => endpoints.assets.update(id),
  delete: (id: string) => endpoints.assets.delete(id),
});

export const useAssets = assetHooks.useList;
export const useAsset = assetHooks.useById;
export const useCreateAsset = assetHooks.useCreate;
export const useUpdateAsset = assetHooks.useUpdate;
export const useDeleteAsset = assetHooks.useDelete;

export const useSubmitAsset = createStatusActionHook('assets', 'submit', (id) => endpoints.assets.submit(id));
export const useActivateAsset = createStatusActionHook('assets', 'activate', (id) => endpoints.assets.activate(id));
export const useDisposeAsset = createStatusActionHook('assets', 'dispose', (id) => endpoints.assets.dispose(id));
export const useScrapAsset = createStatusActionHook('assets', 'scrap', (id) => endpoints.assets.scrap(id));

// ─── Asset Categories ───────────────────────────────────────────────────────

const categoryHooks = createCrudHooks('assetCategories', {
  list: endpoints.assetCategories.list,
  get: (id: string) => endpoints.assetCategories.get(id),
  create: endpoints.assetCategories.create,
  update: (id: string) => endpoints.assetCategories.update(id),
  delete: (id: string) => endpoints.assetCategories.delete(id),
});

export const useAssetCategories = categoryHooks.useList;
export const useAssetCategory = categoryHooks.useById;
export const useCreateAssetCategory = categoryHooks.useCreate;
export const useUpdateAssetCategory = categoryHooks.useUpdate;
export const useDeleteAssetCategory = categoryHooks.useDelete;

// ─── Asset Maintenance ──────────────────────────────────────────────────────

const maintenanceHooks = createCrudHooks('assetMaintenance', {
  list: endpoints.assetMaintenance.list,
  get: (id: string) => endpoints.assetMaintenance.get(id),
  create: endpoints.assetMaintenance.create,
  update: (id: string) => endpoints.assetMaintenance.update(id),
  delete: (id: string) => endpoints.assetMaintenance.delete(id),
});

export const useAssetMaintenanceList = maintenanceHooks.useList;
export const useAssetMaintenance = maintenanceHooks.useById;
export const useCreateAssetMaintenance = maintenanceHooks.useCreate;
export const useUpdateAssetMaintenance = maintenanceHooks.useUpdate;
export const useDeleteAssetMaintenance = maintenanceHooks.useDelete;

export const useCompleteMaintenance = createStatusActionHook('assetMaintenance', 'complete', (id) => endpoints.assetMaintenance.complete(id));
