import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del, endpoints } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConstructionContract {
  id: string;
  contractNumber: string;
  name: string;
  clientName: string;
  clientGstin?: string;
  contractType: string;
  status: string;
  contractValue: string;
  gstRate: string;
  retentionPercentage: string;
  mobilisationAdvance: string;
  startDate?: string;
  endDate?: string;
  revisedEndDate?: string;
  projectLocation?: string;
  state?: string;
  isReraApplicable: boolean;
  reraNumber?: string;
  isBocwApplicable: boolean;
  totalBilled: string;
  totalReceived: string;
  retentionHeld: string;
  completionPercentage: string;
  notes?: string;
  createdAt: string;
  boqItems?: BoqItem[];
}

export interface BoqItem {
  id: string;
  contractId: string;
  itemCode: string;
  description: string;
  itemType: string;
  unit: string;
  quantity: string;
  rate: string;
  amount: string;
  quantityExecuted: string;
  amountBilled: string;
  sortOrder: number;
}

export interface RaBill {
  id: string;
  contractId: string;
  billNumber: string;
  billDate: string;
  status: string;
  billSequence: number;
  grossAmount: string;
  currentBillAmount: string;
  previousBilledAmount: string;
  retentionAmount: string;
  gstAmount: string;
  gstRate: string;
  netPayable: string;
  measurementPeriodFrom?: string;
  measurementPeriodTo?: string;
  certifiedBy?: string;
  certifiedAt?: string;
  notes?: string;
  createdAt: string;
  lines?: RaBillLine[];
}

export interface RaBillLine {
  id: string;
  boqItemId: string;
  description?: string;
  unit: string;
  totalQuantity: string;
  previousQuantity: string;
  currentQuantity: string;
  rate: string;
  amount: string;
}

export interface ConstructionWorkOrder {
  id: string;
  contractId: string;
  workOrderNumber: string;
  type: string;
  status: string;
  vendorName: string;
  vendorGstin?: string;
  vendorPan?: string;
  vendorType: string;
  scopeOfWork: string;
  orderValue: string;
  gstRate: string;
  retentionPercentage: string;
  tdsApplicable: boolean;
  tdsRate: string;
  tdsSection: string;
  totalPaid: string;
  tdsDeducted: string;
  retentionHeld: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  lines?: any[];
  payments?: WorkOrderPayment[];
}

export interface WorkOrderPayment {
  id: string;
  workOrderId: string;
  paymentNumber: string;
  paymentDate: string;
  grossAmount: string;
  gstAmount: string;
  tdsAmount: string;
  retentionAmount: string;
  netPayable: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface SiteGrn {
  id: string;
  contractId: string;
  grnNumber: string;
  grnDate: string;
  status: string;
  supplierName?: string;
  vehicleNumber?: string;
  challanNumber?: string;
  warehouseId?: string;
  totalValue: string;
  notes?: string;
  createdAt: string;
  lines?: SiteGrnLine[];
}

export interface SiteGrnLine {
  id: string;
  itemId: string;
  itemDescription?: string;
  unit: string;
  quantityReceived: string;
  quantityRejected: string;
  unitRate: string;
  amount: string;
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export function useContracts(params?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['construction-contracts', params],
    queryFn: () => get<ConstructionContract[]>(endpoints.constructionContracts.list, params as any),
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['construction-contracts', id],
    queryFn: () => get<ConstructionContract>(endpoints.constructionContracts.get(id)),
    enabled: !!id,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ConstructionContract>) =>
      post<ConstructionContract>(endpoints.constructionContracts.create, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['construction-contracts'] }),
  });
}

export function useUpdateContractStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      put<ConstructionContract>(endpoints.constructionContracts.updateStatus(id), { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['construction-contracts'] }),
  });
}

// ─── RA Bills ─────────────────────────────────────────────────────────────────

export function useRaBills(params?: { contractId?: string; status?: string }) {
  return useQuery({
    queryKey: ['ra-bills', params],
    queryFn: () => get<RaBill[]>(endpoints.raBills.list, params as any),
  });
}

export function useRaBill(id: string) {
  return useQuery({
    queryKey: ['ra-bills', id],
    queryFn: () => get<RaBill>(endpoints.raBills.get(id)),
    enabled: !!id,
  });
}

export function useCreateRaBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post<RaBill>(endpoints.raBills.create, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ra-bills'] });
      qc.invalidateQueries({ queryKey: ['construction-contracts'] });
    },
  });
}

export function useCertifyRaBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, certifiedBy }: { id: string; certifiedBy: string }) =>
      put<RaBill>(endpoints.raBills.certify(id), { certifiedBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ra-bills'] });
      qc.invalidateQueries({ queryKey: ['construction-contracts'] });
    },
  });
}

export function useUpdateRaBillStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      put<RaBill>(endpoints.raBills.updateStatus(id), { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ra-bills'] }),
  });
}

// ─── Construction Work Orders ─────────────────────────────────────────────────

export function useConstructionWorkOrders(params?: { contractId?: string; status?: string }) {
  return useQuery({
    queryKey: ['construction-work-orders', params],
    queryFn: () => get<ConstructionWorkOrder[]>(endpoints.constructionWorkOrders.list, params as any),
  });
}

export function useConstructionWorkOrder(id: string) {
  return useQuery({
    queryKey: ['construction-work-orders', id],
    queryFn: () => get<ConstructionWorkOrder>(endpoints.constructionWorkOrders.get(id)),
    enabled: !!id,
  });
}

export function useCreateConstructionWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post<ConstructionWorkOrder>(endpoints.constructionWorkOrders.create, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['construction-work-orders'] }),
  });
}

export function useApproveConstructionWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<ConstructionWorkOrder>(endpoints.constructionWorkOrders.approve(id), {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['construction-work-orders'] }),
  });
}

// ─── Site GRNs ────────────────────────────────────────────────────────────────

export function useSiteGrns(params?: { contractId?: string; status?: string }) {
  return useQuery({
    queryKey: ['site-grns', params],
    queryFn: () => get<SiteGrn[]>(endpoints.siteGrns.list, params as any),
  });
}

export function useSiteGrn(id: string) {
  return useQuery({
    queryKey: ['site-grns', id],
    queryFn: () => get<SiteGrn>(endpoints.siteGrns.get(id)),
    enabled: !!id,
  });
}

export function useSubmitSiteGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<SiteGrn>(endpoints.siteGrns.submit(id), {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-grns'] }),
  });
}

export function useCreateSiteGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post<SiteGrn>(endpoints.siteGrns.create, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-grns'] });
      qc.invalidateQueries({ queryKey: ['construction-contracts'] });
    },
  });
}

export function useApproveSiteGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<SiteGrn>(endpoints.siteGrns.approve(id), {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-grns'] }),
  });
}

// ─── Measurement Books ─────────────────────────────────────────────────────

export interface MeasurementBook {
  id: string;
  contractId: string;
  mbNumber: string;
  measurementDate: string;
  measuredBy?: string;
  checkedBy?: string;
  status: string;
  notes?: string;
  createdAt: string;
  lines?: MeasurementBookLine[];
}

export interface MeasurementBookLine {
  id: string;
  boqItemId: string;
  description?: string;
  noOfItems?: string;
  length?: string;
  breadth?: string;
  height?: string;
  quantity: string;
  rate: string;
  amount: string;
}

export function useMeasurementBooks(params?: { contractId?: string; status?: string }) {
  return useQuery({
    queryKey: ['measurement-books', params],
    queryFn: () => get<MeasurementBook[]>(endpoints.measurementBooks.list, params as any),
  });
}

export function useMeasurementBook(id: string) {
  return useQuery({
    queryKey: ['measurement-books', id],
    queryFn: () => get<MeasurementBook>(endpoints.measurementBooks.get(id)),
    enabled: !!id,
  });
}

export function useCreateMeasurementBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post<MeasurementBook>(endpoints.measurementBooks.create, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurement-books'] }),
  });
}

export function useApproveMeasurementBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<MeasurementBook>(endpoints.measurementBooks.approve(id), {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['measurement-books'] }),
  });
}

// ─── DPRs ──────────────────────────────────────────────────────────────────

export interface Dpr {
  id: string;
  contractId: string;
  dprNumber: string;
  reportDate: string;
  status: string;
  weather?: string;
  temperature?: string;
  skilledLabour: number;
  unskilledLabour: number;
  supervisors: number;
  engineers: number;
  workDoneToday?: string;
  issuesObserved?: string;
  nextDayPlan?: string;
  visitorsOnSite?: string;
  createdAt: string;
  workItems?: DprWorkItem[];
}

export interface DprWorkItem {
  id: string;
  dprId: string;
  boqItemId?: string;
  description: string;
  unit: string;
  quantityToday: string;
  cumulativeQuantity: string;
  remarks?: string;
}

export function useDprs(params?: { contractId?: string; status?: string }) {
  return useQuery({
    queryKey: ['dprs', params],
    queryFn: () => get<Dpr[]>(endpoints.dprs.list, params as any),
  });
}

export function useDpr(id: string) {
  return useQuery({
    queryKey: ['dprs', id],
    queryFn: () => get<Dpr>(endpoints.dprs.get(id)),
    enabled: !!id,
  });
}

export function useCreateDpr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post<Dpr>(endpoints.dprs.create, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dprs'] }),
  });
}

export function useSubmitDpr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<Dpr>(endpoints.dprs.submit(id), {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dprs'] }),
  });
}

export function useApproveDpr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<Dpr>(endpoints.dprs.approve(id), {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dprs'] }),
  });
}

// ─── Site Material Issues ──────────────────────────────────────────────────

export interface MaterialIssue {
  id: string;
  contractId: string;
  issueNumber: string;
  issueDate: string;
  status: string;
  warehouseId: string;
  issuedTo?: string;
  boqItemId?: string;
  totalValue: string;
  notes?: string;
  createdAt: string;
  lines?: MaterialIssueLine[];
}

export interface MaterialIssueLine {
  id: string;
  itemId: string;
  itemDescription?: string;
  unit: string;
  quantityIssued: string;
  unitRate: string;
  amount: string;
}

export function useMaterialIssues(params?: { contractId?: string; status?: string }) {
  return useQuery({
    queryKey: ['material-issues', params],
    queryFn: () => get<MaterialIssue[]>(endpoints.materialIssues.list, params as any),
  });
}

export function useMaterialIssue(id: string) {
  return useQuery({
    queryKey: ['material-issues', id],
    queryFn: () => get<MaterialIssue>(endpoints.materialIssues.get(id)),
    enabled: !!id,
  });
}

export function useCreateMaterialIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post<MaterialIssue>(endpoints.materialIssues.create, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-issues'] });
      qc.invalidateQueries({ queryKey: ['construction-contracts'] });
    },
  });
}

export function useApproveMaterialIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<MaterialIssue>(endpoints.materialIssues.approve(id), {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['material-issues'] }),
  });
}
