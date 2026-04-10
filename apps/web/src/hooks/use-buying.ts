'use client';

import { endpoints } from '@/lib/api';
import { createCrudHooks, createStatusActionHook, type CrudEndpoints } from './create-crud-hooks';

// ── Supplier ──────────────────────────────────────────────

export interface Supplier {
  id: string;
  tenantId: string;
  supplierNumber: string | null;
  name: string;
  supplierType: 'company' | 'individual' | null;
  company: string;
  email: string;
  phone: string;
  website: string | null;
  taxId: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  contactPerson: string | null;
  paymentTerms: string | null;
  creditLimit: string | null;
  bankAccount: string | null;
  notes: string | null;
  rating: number;
  status: 'active' | 'inactive';
  panNumber: string | null;
  gstNumber: string | null;
  msmeRegistered: boolean;
  msmeCategory: 'micro' | 'small' | 'medium' | null;
  msmeNumber: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  bankName: string | null;
  bankBranch: string | null;
  tdsApplicable: boolean;
  defaultTdsSectionId: string | null;
  createdAt: string;
  updatedAt: string;
}

const supplierEndpoints: CrudEndpoints = {
  list: endpoints.suppliers.list,
  get: endpoints.suppliers.get,
  create: endpoints.suppliers.create,
  update: endpoints.suppliers.update,
  delete: endpoints.suppliers.delete,
};

const supplierHooks = createCrudHooks<Supplier>('suppliers', supplierEndpoints);

export const useSuppliers = supplierHooks.useList;
export const useSupplier = supplierHooks.useById;
export const useCreateSupplier = supplierHooks.useCreate;
export const useUpdateSupplier = supplierHooks.useUpdate;
export const useDeleteSupplier = supplierHooks.useDelete;
export const supplierKeys = supplierHooks.queryKeys;

export const useActivateSupplier = createStatusActionHook<Supplier>(
  'suppliers',
  'activate',
  (id: string) => `/buying/suppliers/${id}/activate`,
);

export const useDeactivateSupplier = createStatusActionHook<Supplier>(
  'suppliers',
  'deactivate',
  (id: string) => `/buying/suppliers/${id}/deactivate`,
);

// ── Purchase Order ────────────────────────────────────────

export interface PurchaseOrderLine {
  id: string;
  lineNumber: number;
  itemId: string | null;
  description: string | null;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  supplierId: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'partially_received' | 'cancelled';
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: PurchaseOrderLine[];
}

const purchaseOrderEndpoints: CrudEndpoints = {
  list: endpoints.purchaseOrders.list,
  get: endpoints.purchaseOrders.get,
  create: endpoints.purchaseOrders.create,
  update: endpoints.purchaseOrders.update,
  delete: endpoints.purchaseOrders.delete,
};

const poHooks = createCrudHooks<PurchaseOrder>('purchaseOrders', purchaseOrderEndpoints);

export const usePurchaseOrders = poHooks.useList;
export const usePurchaseOrder = poHooks.useById;
export const useCreatePurchaseOrder = poHooks.useCreate;
export const useUpdatePurchaseOrder = poHooks.useUpdate;
export const useDeletePurchaseOrder = poHooks.useDelete;
export const purchaseOrderKeys = poHooks.queryKeys;

export const useSubmitPO = createStatusActionHook<PurchaseOrder>(
  'purchaseOrders',
  'submit',
  endpoints.purchaseOrders.submit,
);

export const useApprovePO = createStatusActionHook<PurchaseOrder>(
  'purchaseOrders',
  'approve',
  endpoints.purchaseOrders.approve,
);

export const useCancelPO = createStatusActionHook<PurchaseOrder>(
  'purchaseOrders',
  'cancel',
  endpoints.purchaseOrders.cancel,
);

// ── Purchase Receipt ──────────────────────────────────────

export interface PurchaseReceiptItem {
  id: string;
  lineNumber: number;
  itemId: string | null;
  description: string | null;
  orderedQty: string;
  receivedQty: string;
  unitPrice: string;
  lineTotal: string;
}

export interface PurchaseReceipt {
  id: string;
  tenantId: string;
  receiptNumber: string;
  purchaseOrderId: string;
  purchaseOrder: string;
  supplierId: string;
  supplier: string;
  receiptDate: string;
  warehouse: string;
  status: 'draft' | 'submitted' | 'completed';
  itemCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseReceiptItem[];
}

const purchaseReceiptEndpoints: CrudEndpoints = {
  list: endpoints.purchaseReceipts.list,
  get: endpoints.purchaseReceipts.get,
  create: endpoints.purchaseReceipts.create,
  update: endpoints.purchaseReceipts.update,
  delete: (id: string) => `/buying/purchase-receipts/${id}`,
};

const receiptHooks = createCrudHooks<PurchaseReceipt>('purchaseReceipts', purchaseReceiptEndpoints);

export const usePurchaseReceipts = receiptHooks.useList;
export const usePurchaseReceipt = receiptHooks.useById;
export const useCreatePurchaseReceipt = receiptHooks.useCreate;
export const useUpdatePurchaseReceipt = receiptHooks.useUpdate;
export const useDeletePurchaseReceipt = receiptHooks.useDelete;
export const purchaseReceiptKeys = receiptHooks.queryKeys;

export const useSubmitReceipt = createStatusActionHook<PurchaseReceipt>(
  'purchaseReceipts',
  'submit',
  endpoints.purchaseReceipts.submit,
);

export const useCompleteReceipt = createStatusActionHook<PurchaseReceipt>(
  'purchaseReceipts',
  'complete',
  endpoints.purchaseReceipts.complete,
);

// ── Supplier Quotation ────────────────────────────────────

export interface SupplierQuotationLine {
  id: string;
  lineNumber: number;
  itemId: string | null;
  description: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface SupplierQuotation {
  id: string;
  tenantId: string;
  quotationNumber: string;
  supplierId: string;
  supplier: string;
  quotationDate: string;
  requestDate: string;
  validUntil: string | null;
  status: 'draft' | 'sent' | 'received' | 'accepted' | 'rejected';
  subtotal: string;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: SupplierQuotationLine[];
}

const supplierQuotationEndpoints: CrudEndpoints = {
  list: endpoints.supplierQuotations.list,
  get: endpoints.supplierQuotations.get,
  create: endpoints.supplierQuotations.create,
  update: (id: string) => `/buying/supplier-quotations/${id}`,
  delete: (id: string) => `/buying/supplier-quotations/${id}`,
};

const sqHooks = createCrudHooks<SupplierQuotation>('supplierQuotations', supplierQuotationEndpoints);

export const useSupplierQuotations = sqHooks.useList;
export const useSupplierQuotation = sqHooks.useById;
export const useCreateSupplierQuotation = sqHooks.useCreate;
export const useUpdateSupplierQuotation = sqHooks.useUpdate;
export const useDeleteSupplierQuotation = sqHooks.useDelete;
export const supplierQuotationKeys = sqHooks.queryKeys;

export const useReceiveQuotation = createStatusActionHook<SupplierQuotation>(
  'supplierQuotations',
  'receive',
  endpoints.supplierQuotations.receive,
);

export const useAcceptQuotation = createStatusActionHook<SupplierQuotation>(
  'supplierQuotations',
  'accept',
  endpoints.supplierQuotations.accept,
);

export const useRejectQuotation = createStatusActionHook<SupplierQuotation>(
  'supplierQuotations',
  'reject',
  endpoints.supplierQuotations.reject,
);

export const useSendQuotation = createStatusActionHook<SupplierQuotation>(
  'supplierQuotations',
  'send',
  (id: string) => `/buying/supplier-quotations/${id}/send`,
);

export const useConvertQuotation = createStatusActionHook<SupplierQuotation>(
  'supplierQuotations',
  'convert',
  (id: string) => `/buying/supplier-quotations/${id}/convert`,
);

// ── Material Request ─────────────────────────────────────

export interface MaterialRequestLine {
  id: string;
  itemId: string;
  description: string | null;
  quantity: string;
  orderedQty: string;
  uom: string;
  preferredSupplierId: string | null;
  warehouseId: string | null;
  itemName: string | null;
  itemCode: string | null;
}

export interface MaterialRequest {
  id: string;
  tenantId: string;
  requestNumber: string;
  requestType: 'purchase' | 'transfer' | 'manufacture';
  requestDate: string;
  requiredDate: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'partially_ordered' | 'ordered' | 'rejected' | 'cancelled';
  department: string | null;
  purpose: string | null;
  notes: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: MaterialRequestLine[];
}

const materialRequestEndpoints: CrudEndpoints = {
  list: endpoints.materialRequests.list,
  get: endpoints.materialRequests.get,
  create: endpoints.materialRequests.create,
  update: endpoints.materialRequests.update,
  delete: endpoints.materialRequests.delete,
};

const mrHooks = createCrudHooks<MaterialRequest>('materialRequests', materialRequestEndpoints);

export const useMaterialRequests = mrHooks.useList;
export const useMaterialRequest = mrHooks.useById;
export const useCreateMaterialRequest = mrHooks.useCreate;
export const useUpdateMaterialRequest = mrHooks.useUpdate;
export const useDeleteMaterialRequest = mrHooks.useDelete;
export const materialRequestKeys = mrHooks.queryKeys;

export const useSubmitMR = createStatusActionHook<MaterialRequest>(
  'materialRequests',
  'submit',
  endpoints.materialRequests.submit,
);

export const useApproveMR = createStatusActionHook<MaterialRequest>(
  'materialRequests',
  'approve',
  endpoints.materialRequests.approve,
);

export const useRejectMR = createStatusActionHook<MaterialRequest>(
  'materialRequests',
  'reject',
  endpoints.materialRequests.reject,
);

export const useConvertMRToPO = createStatusActionHook<MaterialRequest>(
  'materialRequests',
  'convertToPo',
  endpoints.materialRequests.convertToPo,
);
