import axios, { type AxiosError, type AxiosResponse } from "axios";
import type { ApiResponse } from "@/types/api";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor: attach auth token and tenant header
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("nexus_access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const tenantStr = localStorage.getItem("nexus_tenant");
      if (tenantStr) {
        try {
          const tenant = JSON.parse(tenantStr);
          if (tenant?.id) {
            config.headers["X-Tenant-ID"] = tenant.id;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Auth refresh handling ───────────────────────────────────────────
//
// Access tokens expire in 15 minutes. Instead of logging the user out the
// moment the token expires, we transparently exchange the long-lived
// refresh token (7 days) for a new pair via POST /auth/refresh, then
// retry the original request. If the refresh ITSELF fails (refresh token
// expired or invalidated), THEN we log the user out.
//
// Concurrency control: while one refresh is in flight, every other
// 401-failing request is queued and retried with the new token once the
// refresh completes. This avoids N parallel refreshes and the resulting
// race where each refresh invalidates the others' tokens.

let isRefreshing = false;
type Subscriber = (token: string | null) => void;
let pendingRequests: Subscriber[] = [];

function fanOut(token: string | null) {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
}

function clearAuthAndRedirect() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("nexus_access_token");
  localStorage.removeItem("nexus_refresh_token");
  localStorage.removeItem("nexus_user");
  localStorage.removeItem("nexus_tenant");
  localStorage.removeItem("nexus_permissions");
  // Use location.replace so /login is not in the back-stack.
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

/**
 * Replace axios's generic "Request failed with status code NNN" with the
 * backend's actual message (NestJS returns `{ message: string | string[] }`)
 * so `err.message` is meaningful everywhere — toasts, catch blocks, logs.
 * The original axios error shape (response, status, config) is preserved.
 */
function normalizeErrorMessage(error: AxiosError): AxiosError {
  const data = error.response?.data as
    | { message?: string | string[]; error?: string }
    | undefined;
  const msg = data?.message;
  if (Array.isArray(msg) && msg.length > 0) {
    error.message = msg.join(", ");
  } else if (typeof msg === "string" && msg.trim()) {
    error.message = msg;
  } else if (typeof data?.error === "string" && data.error.trim()) {
    error.message = data.error;
  }
  return error;
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (rawError: AxiosError<ApiResponse<null>>) => {
    const error = normalizeErrorMessage(rawError);
    const original = error.config as
      | (NonNullable<AxiosError["config"]> & { _retry?: boolean })
      | undefined;

    // Pass through anything that isn't a 401 or doesn't have a config.
    if (!original || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Don't try to refresh on the login or refresh endpoints themselves.
    const url = original.url ?? "";
    if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    // Already retried once — give up.
    if (original._retry) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (typeof window === "undefined") {
      return Promise.reject(error);
    }
    const refreshToken = localStorage.getItem("nexus_refresh_token");
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    // If a refresh is in flight, queue this request.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((newToken) => {
          if (!newToken) {
            reject(error);
            return;
          }
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
          api(original).then(resolve, reject);
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Use a bare axios call (not `api`) so the interceptor doesn't recurse on this refresh.
      const refreshUrl = `${api.defaults.baseURL}/auth/refresh`;
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: string;
      }>(refreshUrl, { refreshToken });

      localStorage.setItem("nexus_access_token", data.accessToken);
      localStorage.setItem("nexus_refresh_token", data.refreshToken);

      // Wake up queued requests with the new token.
      fanOut(data.accessToken);

      // Retry the original request with the new token.
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshErr) {
      // Refresh token itself is invalid / expired → real logout.
      fanOut(null);
      clearAuthAndRedirect();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// Helper to unwrap API responses.
// Some endpoints (finance, etc.) return raw data, while others might wrap in { data: T }.
// This function handles both formats gracefully.
function unwrap<T>(responseData: unknown): T {
  if (
    responseData !== null &&
    typeof responseData === "object" &&
    !Array.isArray(responseData) &&
    "data" in (responseData as Record<string, unknown>)
  ) {
    return (responseData as ApiResponse<T>).data;
  }
  return responseData as T;
}

// Typed request helpers
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get(url, { params });
  return unwrap<T>(response.data);
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const response = await api.post(url, data);
  return unwrap<T>(response.data);
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  const response = await api.put(url, data);
  return unwrap<T>(response.data);
}

export async function del<T>(url: string): Promise<T> {
  const response = await api.delete(url);
  return unwrap<T>(response.data);
}

/**
 * Extract a human-readable message from an axios/API error. NestJS returns
 * `{ message: string | string[] }` (class-validator yields an array). Falls
 * back to the provided default when no message is available.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (typeof e?.message === 'string' && e.message.trim()) return e.message;
  return fallback;
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    mfaVerify: '/auth/mfa/verify',
  },
  accounts: {
    list: '/finance/accounts',
    tree: '/finance/accounts/tree',
    get: (id: string) => `/finance/accounts/${id}`,
    create: '/finance/accounts',
    update: (id: string) => `/finance/accounts/${id}`,
    delete: (id: string) => `/finance/accounts/${id}`,
  },
  journalEntries: {
    list: '/finance/journal-entries',
    get: (id: string) => `/finance/journal-entries/${id}`,
    create: '/finance/journal-entries',
    update: (id: string) => `/finance/journal-entries/${id}`,
    post: (id: string) => `/finance/journal-entries/${id}/post`,
    reverse: (id: string) => `/finance/journal-entries/${id}/reverse`,
    delete: (id: string) => `/finance/journal-entries/${id}`,
  },
  invoices: {
    list: '/finance/invoices',
    get: (id: string) => `/finance/invoices/${id}`,
    create: '/finance/invoices',
    update: (id: string) => `/finance/invoices/${id}`,
    confirm: (id: string) => `/finance/invoices/${id}/confirm`,
    send: (id: string) => `/finance/invoices/${id}/send`,
    payment: (id: string) => `/finance/invoices/${id}/payment`,
    void: (id: string) => `/finance/invoices/${id}/void`,
    delete: (id: string) => `/finance/invoices/${id}`,
  },
  payments: {
    list: '/finance/payments',
    get: (id: string) => `/finance/payments/${id}`,
    create: '/finance/payments',
    confirm: (id: string) => `/finance/payments/${id}/confirm`,
    void: (id: string) => `/finance/payments/${id}/void`,
    allocations: (id: string) => `/finance/payments/${id}/allocations`,
    update: (id: string) => `/finance/payments/${id}`,
    delete: (id: string) => `/finance/payments/${id}`,
  },
  reports: {
    generalLedger: '/finance/reports/general-ledger',
    trialBalance: '/finance/reports/trial-balance',
    profitLoss: '/finance/reports/profit-loss',
    balanceSheet: '/finance/reports/balance-sheet',
    cashFlow: '/finance/reports/cash-flow',
    receivableAging: '/finance/reports/receivable-aging',
    payableAging: '/finance/reports/payable-aging',
    budgetVariance: (budgetId: string) => `/finance/reports/budget-variance/${budgetId}`,
    vendorLedger: (supplierId: string) => `/finance/reports/vendor-ledger/${supplierId}`,
    tdsPayment: '/finance/reports/tds-payment',
    tdsReturn: '/finance/reports/tds-return',
  },
  users: {
    list: '/users',
    me: '/users/me',
    get: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
    issueResetLink: (id: string) => `/users/${id}/issue-reset-link`,
    changeMyPassword: '/users/me/password',
  },
  roles: {
    list: '/roles',
    get: (id: string) => `/roles/${id}`,
    create: '/roles',
    update: (id: string) => `/roles/${id}`,
    delete: (id: string) => `/roles/${id}`,
  },
  // Inventory
  items: {
    list: '/inventory/items',
    get: (id: string) => `/inventory/items/${id}`,
    create: '/inventory/items',
    update: (id: string) => `/inventory/items/${id}`,
    delete: (id: string) => `/inventory/items/${id}`,
  },
  warehouses: {
    list: '/inventory/warehouses',
    get: (id: string) => `/inventory/warehouses/${id}`,
    create: '/inventory/warehouses',
    update: (id: string) => `/inventory/warehouses/${id}`,
    delete: (id: string) => `/inventory/warehouses/${id}`,
  },
  stockMovements: {
    list: '/inventory/stock-movements',
    adjust: '/inventory/stock-adjustments',
    transfer: '/inventory/stock/transfer',
    submitAdjustment: (id: string) => `/inventory/stock-adjustments/${id}/submit`,
    approveAdjustment: (id: string) => `/inventory/stock-adjustments/${id}/approve`,
  },
  valuation: {
    report: '/inventory/valuation',
  },
  reorder: {
    check: '/inventory/check-reorder',
  },
  // Selling
  customers: {
    list: '/selling/customers',
    get: (id: string) => `/selling/customers/${id}`,
    create: '/selling/customers',
    update: (id: string) => `/selling/customers/${id}`,
    delete: (id: string) => `/selling/customers/${id}`,
  },
  salesOrders: {
    list: '/selling/sales-orders',
    get: (id: string) => `/selling/sales-orders/${id}`,
    create: '/selling/sales-orders',
    update: (id: string) => `/selling/sales-orders/${id}`,
    confirm: (id: string) => `/selling/sales-orders/${id}/confirm`,
    cancel: (id: string) => `/selling/sales-orders/${id}/cancel`,
    createInvoice: (id: string) => `/selling/sales-orders/${id}/create-invoice`,
    createDeliveryNote: (id: string) => `/selling/sales-orders/${id}/create-delivery-note`,
    delete: (id: string) => `/selling/sales-orders/${id}`,
  },
  quotations: {
    list: '/selling/quotations',
    get: (id: string) => `/selling/quotations/${id}`,
    create: '/selling/quotations',
    update: (id: string) => `/selling/quotations/${id}`,
    send: (id: string) => `/selling/quotations/${id}/send`,
    accept: (id: string) => `/selling/quotations/${id}/accept`,
    reject: (id: string) => `/selling/quotations/${id}/reject`,
    convertToSo: (id: string) => `/selling/quotations/${id}/convert-to-so`,
    delete: (id: string) => `/selling/quotations/${id}`,
  },
  deliveryNotes: {
    list: '/selling/delivery-notes',
    get: (id: string) => `/selling/delivery-notes/${id}`,
    create: '/selling/delivery-notes',
    update: (id: string) => `/selling/delivery-notes/${id}`,
    dispatch: (id: string) => `/selling/delivery-notes/${id}/dispatch`,
    deliver: (id: string) => `/selling/delivery-notes/${id}/deliver`,
    createInvoice: (id: string) => `/selling/delivery-notes/${id}/create-invoice`,
  },
  // Buying
  suppliers: {
    list: '/buying/suppliers',
    get: (id: string) => `/buying/suppliers/${id}`,
    create: '/buying/suppliers',
    update: (id: string) => `/buying/suppliers/${id}`,
    delete: (id: string) => `/buying/suppliers/${id}`,
  },
  purchaseOrders: {
    list: '/buying/purchase-orders',
    get: (id: string) => `/buying/purchase-orders/${id}`,
    create: '/buying/purchase-orders',
    update: (id: string) => `/buying/purchase-orders/${id}`,
    submit: (id: string) => `/buying/purchase-orders/${id}/submit`,
    approve: (id: string) => `/buying/purchase-orders/${id}/approve`,
    cancel: (id: string) => `/buying/purchase-orders/${id}/cancel`,
    createBill: (id: string) => `/buying/purchase-orders/${id}/create-bill`,
    createGRN: (id: string) => `/buying/purchase-orders/${id}/create-grn`,
    delete: (id: string) => `/buying/purchase-orders/${id}`,
  },
  purchaseReceipts: {
    list: '/buying/purchase-receipts',
    get: (id: string) => `/buying/purchase-receipts/${id}`,
    create: '/buying/purchase-receipts',
    update: (id: string) => `/buying/purchase-receipts/${id}`,
    submit: (id: string) => `/buying/purchase-receipts/${id}/submit`,
    complete: (id: string) => `/buying/purchase-receipts/${id}/complete`,
  },
  supplierQuotations: {
    list: '/buying/supplier-quotations',
    get: (id: string) => `/buying/supplier-quotations/${id}`,
    create: '/buying/supplier-quotations',
    receive: (id: string) => `/buying/supplier-quotations/${id}/receive`,
    accept: (id: string) => `/buying/supplier-quotations/${id}/accept`,
    reject: (id: string) => `/buying/supplier-quotations/${id}/reject`,
    convertToPo: (id: string) => `/buying/supplier-quotations/${id}/convert-to-po`,
  },
  budgets: {
    list: '/finance/budgets',
    get: (id: string) => `/finance/budgets/${id}`,
    create: '/finance/budgets',
    update: (id: string) => `/finance/budgets/${id}`,
    activate: (id: string) => `/finance/budgets/${id}/activate`,
    close: (id: string) => `/finance/budgets/${id}/close`,
    refreshActuals: (id: string) => `/finance/budgets/${id}/refresh-actuals`,
    delete: (id: string) => `/finance/budgets/${id}`,
  },
  materialRequests: {
    list: '/buying/material-requests',
    get: (id: string) => `/buying/material-requests/${id}`,
    create: '/buying/material-requests',
    update: (id: string) => `/buying/material-requests/${id}`,
    submit: (id: string) => `/buying/material-requests/${id}/submit`,
    approve: (id: string) => `/buying/material-requests/${id}/approve`,
    reject: (id: string) => `/buying/material-requests/${id}/reject`,
    convertToPo: (id: string) => `/buying/material-requests/${id}/convert-to-po`,
    delete: (id: string) => `/buying/material-requests/${id}`,
  },
  bills: {
    list: '/finance/bills',
    get: (id: string) => `/finance/bills/${id}`,
    create: '/finance/bills',
    approve: (id: string) => `/finance/bills/${id}/approve`,
    void: (id: string) => `/finance/bills/${id}/void`,
  },
  // HR
  employees: {
    list: '/hr/employees',
    get: (id: string) => `/hr/employees/${id}`,
    create: '/hr/employees',
    update: (id: string) => `/hr/employees/${id}`,
    delete: (id: string) => `/hr/employees/${id}`,
    inviteToPortal: (id: string) => `/hr/employees/${id}/invite-to-portal`,
  },
  departments: {
    list: '/hr/departments',
    get: (id: string) => `/hr/departments/${id}`,
    create: '/hr/departments',
    update: (id: string) => `/hr/departments/${id}`,
    delete: (id: string) => `/hr/departments/${id}`,
  },
  attendance: {
    list: '/hr/attendance',
    checkIn: '/hr/attendance/check-in',
    checkOut: '/hr/attendance/check-out',
    manual: '/hr/attendance/manual',
    update: (id: string) => `/hr/attendance/${id}`,
    delete: (id: string) => `/hr/attendance/${id}`,
  },
  leaveApplications: {
    list: '/hr/leave-applications',
    get: (id: string) => `/hr/leave-applications/${id}`,
    create: '/hr/leave-applications',
    update: (id: string) => `/hr/leave-applications/${id}`,
    delete: (id: string) => `/hr/leave-applications/${id}`,
    approve: (id: string) => `/hr/leave-applications/${id}/approve`,
    reject: (id: string) => `/hr/leave-applications/${id}/reject`,
    cancel: (id: string) => `/hr/leave-applications/${id}/cancel`,
  },
  leaveTypes: {
    list: '/hr/leave-types',
  },
  expenseClaims: {
    list: '/hr/expense-claims',
    get: (id: string) => `/hr/expense-claims/${id}`,
    create: '/hr/expense-claims',
    update: (id: string) => `/hr/expense-claims/${id}`,
    submit: (id: string) => `/hr/expense-claims/${id}/submit`,
    approve: (id: string) => `/hr/expense-claims/${id}/approve`,
    reject: (id: string) => `/hr/expense-claims/${id}/reject`,
    pay: (id: string) => `/hr/expense-claims/${id}/pay`,
    delete: (id: string) => `/hr/expense-claims/${id}`,
  },
  payroll: {
    list: '/hr/payroll/entries',
    get: (id: string) => `/hr/payroll/entries/${id}`,
    generate: '/hr/payroll/process',
    update: (id: string) => `/hr/payroll/entries/${id}`,
    delete: (id: string) => `/hr/payroll/entries/${id}`,
    approve: (id: string) => `/hr/payroll/entries/${id}/approve`,
    pay: (id: string) => `/hr/payroll/entries/${id}/pay`,
    void: (id: string) => `/hr/payroll/entries/${id}/void`,
  },
  // HR — lifecycle / exit / loans / regularization / announcements / performance
  salaryRevisions: {
    list: '/hr/salary-revisions',
    byEmployee: (employeeId: string) => `/hr/salary-revisions?employeeId=${employeeId}`,
    get: (id: string) => `/hr/salary-revisions/${id}`,
    create: '/hr/salary-revisions',
    update: (id: string) => `/hr/salary-revisions/${id}`,
    delete: (id: string) => `/hr/salary-revisions/${id}`,
  },
  exitClearances: {
    list: '/hr/exit-clearances',
    get: (id: string) => `/hr/exit-clearances/${id}`,
    create: '/hr/exit-clearances',
    update: (id: string) => `/hr/exit-clearances/${id}`,
    settle: (id: string) => `/hr/exit-clearances/${id}/settle`,
    delete: (id: string) => `/hr/exit-clearances/${id}`,
  },
  attendanceRegularizations: {
    list: '/hr/attendance-regularizations',
    approve: (id: string) => `/hr/attendance-regularizations/${id}/approve`,
    reject: (id: string) => `/hr/attendance-regularizations/${id}/reject`,
    delete: (id: string) => `/hr/attendance-regularizations/${id}`,
    essList: '/ess/attendance/regularizations',
    essCreate: '/ess/attendance/regularizations',
  },
  announcements: {
    list: '/hr/announcements',
    get: (id: string) => `/hr/announcements/${id}`,
    create: '/hr/announcements',
    update: (id: string) => `/hr/announcements/${id}`,
    publish: (id: string) => `/hr/announcements/${id}/publish`,
    delete: (id: string) => `/hr/announcements/${id}`,
    essList: '/ess/announcements',
    essUnreadCount: '/ess/announcements/unread-count',
    essRead: (id: string) => `/ess/announcements/${id}/read`,
  },
  performance: {
    cycles: {
      list: '/hr/performance/cycles',
      get: (id: string) => `/hr/performance/cycles/${id}`,
      create: '/hr/performance/cycles',
      update: (id: string) => `/hr/performance/cycles/${id}`,
      delete: (id: string) => `/hr/performance/cycles/${id}`,
      report: (id: string) => `/hr/performance/cycles/${id}/report`,
      reviews: (id: string) => `/hr/performance/cycles/${id}/reviews`,
    },
    templates: {
      list: '/hr/performance/templates',
      get: (id: string) => `/hr/performance/templates/${id}`,
      create: '/hr/performance/templates',
      update: (id: string) => `/hr/performance/templates/${id}`,
      delete: (id: string) => `/hr/performance/templates/${id}`,
    },
    hrGoals: {
      list: '/hr/performance/goals',
      managerComment: (id: string) => `/hr/performance/goals/${id}/manager-comment`,
    },
    hrReviews: { submit: '/hr/performance/reviews' },
    ess: {
      activeCycle: '/ess/performance/cycles/active',
      goals: '/ess/performance/goals',
      goalDetail: (id: string) => `/ess/performance/goals/${id}`,
      myReviews: '/ess/performance/reviews/me',
      submitSelfReview: '/ess/performance/reviews',
    },
  },
  // Recruitment
  jobOpenings: {
    list: '/hr/recruitment/job-openings',
    get: (id: string) => `/hr/recruitment/job-openings/${id}`,
    create: '/hr/recruitment/job-openings',
    update: (id: string) => `/hr/recruitment/job-openings/${id}`,
    publish: (id: string) => `/hr/recruitment/job-openings/${id}/publish`,
    close: (id: string) => `/hr/recruitment/job-openings/${id}/close`,
    delete: (id: string) => `/hr/recruitment/job-openings/${id}`,
  },
  candidates: {
    list: '/hr/recruitment/candidates',
    get: (id: string) => `/hr/recruitment/candidates/${id}`,
    create: '/hr/recruitment/candidates',
    update: (id: string) => `/hr/recruitment/candidates/${id}`,
    interviews: (id: string) => `/hr/recruitment/candidates/${id}/interviews`,
    hire: (id: string) => `/hr/recruitment/candidates/${id}/hire`,
    delete: (id: string) => `/hr/recruitment/candidates/${id}`,
  },
  recruitmentInterviews: {
    create: '/hr/recruitment/interviews',
    complete: (id: string) => `/hr/recruitment/interviews/${id}/complete`,
  },
  recruitmentOffers: {
    create: '/hr/recruitment/offers',
    accept: (id: string) => `/hr/recruitment/offers/${id}/accept`,
    reject: (id: string) => `/hr/recruitment/offers/${id}/reject`,
  },
  // Onboarding
  onboardingTemplates: {
    list: '/hr/onboarding/templates',
    get: (id: string) => `/hr/onboarding/templates/${id}`,
    create: '/hr/onboarding/templates',
    update: (id: string) => `/hr/onboarding/templates/${id}`,
    delete: (id: string) => `/hr/onboarding/templates/${id}`,
  },
  onboardingChecklists: {
    list: '/hr/onboarding/checklists',
    get: (id: string) => `/hr/onboarding/checklists/${id}`,
    create: '/hr/onboarding/checklists',
    kanban: '/hr/onboarding/checklists/kanban',
    myTasks: '/hr/onboarding/checklists/my-tasks',
    updateTaskStatus: (id: string) => `/hr/onboarding/tasks/${id}/status`,
  },
  // Offboarding
  offboardingTemplates: {
    list: '/hr/offboarding/templates',
    get: (id: string) => `/hr/offboarding/templates/${id}`,
    create: '/hr/offboarding/templates',
    update: (id: string) => `/hr/offboarding/templates/${id}`,
    delete: (id: string) => `/hr/offboarding/templates/${id}`,
  },
  offboardingChecklists: {
    list: '/hr/offboarding/checklists',
    get: (id: string) => `/hr/offboarding/checklists/${id}`,
    create: '/hr/offboarding/checklists',
    kanban: '/hr/offboarding/checklists/kanban',
    myTasks: '/hr/offboarding/checklists/my-tasks',
    updateTaskStatus: (id: string) => `/hr/offboarding/tasks/${id}/status`,
  },
  importExport: {
    export: (entity: string) => `/settings/import-export/export?entity=${entity}`,
    import: '/settings/import-export/import',
  },
  approvalWorkflows: {
    list: '/settings/approval-workflows',
    get: (id: string) => `/settings/approval-workflows/${id}`,
    create: '/settings/approval-workflows',
    update: (id: string) => `/settings/approval-workflows/${id}`,
    delete: (id: string) => `/settings/approval-workflows/${id}`,
    pending: '/settings/approval-workflows/requests/pending',
    approve: (id: string) => `/settings/approval-workflows/requests/${id}/approve`,
    reject: (id: string) => `/settings/approval-workflows/requests/${id}/reject`,
  },
  numberSeries: {
    list: '/settings/number-series',
    update: (id: string) => `/settings/number-series/${id}`,
  },
  smtp: {
    get: '/settings/smtp',
    upsert: '/settings/smtp',
    delete: '/settings/smtp',
    testConnection: '/settings/smtp/test-connection',
    testSend: '/settings/smtp/test-send',
  },
  branding: {
    get: '/settings/branding',
    update: '/settings/branding',
    public: (slug: string) => `/auth/branding/${slug}`,
  },
  files: {
    uploadBranding: '/files/upload/branding',
    uploadDocument: '/files/upload/document',
    signed: (path: string) => `/files/signed?path=${encodeURIComponent(path)}`,
  },
  // CRM
  contacts: {
    list: '/crm/contacts',
    get: (id: string) => `/crm/contacts/${id}`,
    create: '/crm/contacts',
    update: (id: string) => `/crm/contacts/${id}`,
    delete: (id: string) => `/crm/contacts/${id}`,
  },
  deals: {
    list: '/crm/deals',
    get: (id: string) => `/crm/deals/${id}`,
    create: '/crm/deals',
    update: (id: string) => `/crm/deals/${id}`,
    won: (id: string) => `/crm/deals/${id}/won`,
    lost: (id: string) => `/crm/deals/${id}/lost`,
    convertToQuotation: (id: string) => `/crm/deals/${id}/convert-to-quotation`,
    delete: (id: string) => `/crm/deals/${id}`,
  },
  leads: {
    list: '/crm/leads',
    get: (id: string) => `/crm/leads/${id}`,
    create: '/crm/leads',
    update: (id: string) => `/crm/leads/${id}`,
    convert: (id: string) => `/crm/leads/${id}/convert`,
    delete: (id: string) => `/crm/leads/${id}`,
  },
  activities: {
    list: '/crm/activities',
    get: (id: string) => `/crm/activities/${id}`,
    create: '/crm/activities',
    update: (id: string) => `/crm/activities/${id}`,
    complete: (id: string) => `/crm/activities/${id}/complete`,
    delete: (id: string) => `/crm/activities/${id}`,
  },
  // Manufacturing
  boms: {
    list: '/manufacturing/bom',
    get: (id: string) => `/manufacturing/bom/${id}`,
    create: '/manufacturing/bom',
    update: (id: string) => `/manufacturing/bom/${id}`,
    activate: (id: string) => `/manufacturing/bom/${id}/activate`,
    deactivate: (id: string) => `/manufacturing/bom/${id}/deactivate`,
    delete: (id: string) => `/manufacturing/bom/${id}`,
  },
  workOrders: {
    list: '/manufacturing/work-orders',
    get: (id: string) => `/manufacturing/work-orders/${id}`,
    create: '/manufacturing/work-orders',
    update: (id: string) => `/manufacturing/work-orders/${id}`,
    start: (id: string) => `/manufacturing/work-orders/${id}/start`,
    complete: (id: string) => `/manufacturing/work-orders/${id}/complete`,
    stop: (id: string) => `/manufacturing/work-orders/${id}/stop`,
    cancel: (id: string) => `/manufacturing/work-orders/${id}/cancel`,
    delete: (id: string) => `/manufacturing/work-orders/${id}`,
  },
  workstations: {
    list: '/manufacturing/workstations',
    get: (id: string) => `/manufacturing/workstations/${id}`,
    create: '/manufacturing/workstations',
    update: (id: string) => `/manufacturing/workstations/${id}`,
    delete: (id: string) => `/manufacturing/workstations/${id}`,
  },
  // Projects
  projects: {
    list: '/projects/projects',
    get: (id: string) => `/projects/projects/${id}`,
    create: '/projects/projects',
    update: (id: string) => `/projects/projects/${id}`,
    activate: (id: string) => `/projects/projects/${id}/activate`,
    hold: (id: string) => `/projects/projects/${id}/hold`,
    complete: (id: string) => `/projects/projects/${id}/complete`,
    cancel: (id: string) => `/projects/projects/${id}/cancel`,
    delete: (id: string) => `/projects/projects/${id}`,
  },
  projectTasks: {
    list: '/projects/tasks',
    get: (id: string) => `/projects/tasks/${id}`,
    create: '/projects/tasks',
    update: (id: string) => `/projects/tasks/${id}`,
    complete: (id: string) => `/projects/tasks/${id}/complete`,
    delete: (id: string) => `/projects/tasks/${id}`,
  },
  timesheets: {
    list: '/projects/timesheets',
    get: (id: string) => `/projects/timesheets/${id}`,
    create: '/projects/timesheets',
    update: (id: string) => `/projects/timesheets/${id}`,
    submit: (id: string) => `/projects/timesheets/${id}/submit`,
    approve: (id: string) => `/projects/timesheets/${id}/approve`,
    reject: (id: string) => `/projects/timesheets/${id}/reject`,
    delete: (id: string) => `/projects/timesheets/${id}`,
    billingSummary: (projectId: string) => `/projects/timesheets/billing-summary/${projectId}`,
    createInvoice: '/projects/timesheets/create-invoice',
  },
  // Assets
  assets: {
    list: '/assets/assets',
    get: (id: string) => `/assets/assets/${id}`,
    create: '/assets/assets',
    update: (id: string) => `/assets/assets/${id}`,
    submit: (id: string) => `/assets/assets/${id}/submit`,
    activate: (id: string) => `/assets/assets/${id}/activate`,
    dispose: (id: string) => `/assets/assets/${id}/dispose`,
    scrap: (id: string) => `/assets/assets/${id}/scrap`,
    delete: (id: string) => `/assets/assets/${id}`,
  },
  assetCategories: {
    list: '/assets/categories',
    get: (id: string) => `/assets/categories/${id}`,
    create: '/assets/categories',
    update: (id: string) => `/assets/categories/${id}`,
    delete: (id: string) => `/assets/categories/${id}`,
  },
  assetMaintenance: {
    list: '/assets/maintenance',
    get: (id: string) => `/assets/maintenance/${id}`,
    create: '/assets/maintenance',
    update: (id: string) => `/assets/maintenance/${id}`,
    complete: (id: string) => `/assets/maintenance/${id}/complete`,
    delete: (id: string) => `/assets/maintenance/${id}`,
  },
  // Quality
  qualityInspections: {
    list: '/quality/inspections',
    get: (id: string) => `/quality/inspections/${id}`,
    create: '/quality/inspections',
    update: (id: string) => `/quality/inspections/${id}`,
    accept: (id: string) => `/quality/inspections/${id}/accept`,
    reject: (id: string) => `/quality/inspections/${id}/reject`,
    delete: (id: string) => `/quality/inspections/${id}`,
  },
  qualityProcedures: {
    list: '/quality/procedures',
    get: (id: string) => `/quality/procedures/${id}`,
    create: '/quality/procedures',
    update: (id: string) => `/quality/procedures/${id}`,
    delete: (id: string) => `/quality/procedures/${id}`,
  },
  ncr: {
    list: '/quality/ncr',
    get: (id: string) => `/quality/ncr/${id}`,
    create: '/quality/ncr',
    update: (id: string) => `/quality/ncr/${id}`,
    close: (id: string) => `/quality/ncr/${id}/close`,
    delete: (id: string) => `/quality/ncr/${id}`,
  },
  // Helpdesk
  tickets: {
    list: '/helpdesk/tickets',
    get: (id: string) => `/helpdesk/tickets/${id}`,
    create: '/helpdesk/tickets',
    update: (id: string) => `/helpdesk/tickets/${id}`,
    reply: (id: string) => `/helpdesk/tickets/${id}/reply`,
    resolve: (id: string) => `/helpdesk/tickets/${id}/resolve`,
    close: (id: string) => `/helpdesk/tickets/${id}/close`,
    reopen: (id: string) => `/helpdesk/tickets/${id}/reopen`,
    delete: (id: string) => `/helpdesk/tickets/${id}`,
  },
  knowledgeBase: {
    list: '/helpdesk/kb',
    get: (id: string) => `/helpdesk/kb/${id}`,
    create: '/helpdesk/kb',
    update: (id: string) => `/helpdesk/kb/${id}`,
    delete: (id: string) => `/helpdesk/kb/${id}`,
  },
  slaPolicies: {
    list: '/helpdesk/sla',
    get: (id: string) => `/helpdesk/sla/${id}`,
    create: '/helpdesk/sla',
    update: (id: string) => `/helpdesk/sla/${id}`,
    delete: (id: string) => `/helpdesk/sla/${id}`,
  },
  // Construction
  constructionContracts: {
    list: '/construction/contracts',
    get: (id: string) => `/construction/contracts/${id}`,
    create: '/construction/contracts',
    updateStatus: (id: string) => `/construction/contracts/${id}/status`,
    addBoq: (id: string) => `/construction/contracts/${id}/boq`,
    delete: (id: string) => `/construction/contracts/${id}`,
  },
  raBills: {
    list: '/construction/ra-bills',
    get: (id: string) => `/construction/ra-bills/${id}`,
    create: '/construction/ra-bills',
    updateStatus: (id: string) => `/construction/ra-bills/${id}/status`,
    certify: (id: string) => `/construction/ra-bills/${id}/certify`,
  },
  constructionWorkOrders: {
    list: '/construction/work-orders',
    get: (id: string) => `/construction/work-orders/${id}`,
    create: '/construction/work-orders',
    approve: (id: string) => `/construction/work-orders/${id}/approve`,
    payment: (id: string) => `/construction/work-orders/${id}/payments`,
    approvePayment: (paymentId: string) => `/construction/work-orders/payments/${paymentId}/approve`,
  },
  siteGrns: {
    list: '/construction/site-grns',
    get: (id: string) => `/construction/site-grns/${id}`,
    create: '/construction/site-grns',
    submit: (id: string) => `/construction/site-grns/${id}/submit`,
    approve: (id: string) => `/construction/site-grns/${id}/approve`,
  },
  measurementBooks: {
    list: '/construction/measurement-books',
    get: (id: string) => `/construction/measurement-books/${id}`,
    create: '/construction/measurement-books',
    approve: (id: string) => `/construction/measurement-books/${id}/approve`,
    addLines: (id: string) => `/construction/measurement-books/${id}/lines`,
  },
  dprs: {
    list: '/construction/dprs',
    get: (id: string) => `/construction/dprs/${id}`,
    create: '/construction/dprs',
    submit: (id: string) => `/construction/dprs/${id}/submit`,
    approve: (id: string) => `/construction/dprs/${id}/approve`,
  },
  materialIssues: {
    list: '/construction/material-issues',
    get: (id: string) => `/construction/material-issues/${id}`,
    create: '/construction/material-issues',
    approve: (id: string) => `/construction/material-issues/${id}/approve`,
  },
  // TDS
  tdsSections: {
    list: '/finance/tds-sections',
    get: (id: string) => `/finance/tds-sections/${id}`,
    create: '/finance/tds-sections',
    update: (id: string) => `/finance/tds-sections/${id}`,
    deactivate: (id: string) => `/finance/tds-sections/${id}/deactivate`,
    seedDefaults: '/finance/tds-sections/seed-defaults',
  },
  tdsDeductions: {
    list: '/finance/tds-deductions',
    vendorLedger: (supplierId: string) => `/finance/tds-deductions/vendor-ledger/${supplierId}`,
  },
  // Dashboard
  dashboard: {
    kpis: '/dashboard/kpis',
    procurement: '/dashboard/procurement',
  },
  // Bank Reconciliation
  bankReconciliation: {
    accounts: '/finance/bank-reconciliation/accounts',
    createAccount: '/finance/bank-reconciliation/accounts',
    transactions: (bankAccountId: string) => `/finance/bank-reconciliation/accounts/${bankAccountId}/transactions`,
    importTransactions: '/finance/bank-reconciliation/transactions/import',
    matchTransaction: (id: string) => `/finance/bank-reconciliation/transactions/${id}/match`,
    autoMatch: (bankAccountId: string) => `/finance/bank-reconciliation/accounts/${bankAccountId}/auto-match`,
    reconcile: (bankAccountId: string) => `/finance/bank-reconciliation/accounts/${bankAccountId}/reconcile`,
    excludeTransaction: (id: string) => `/finance/bank-reconciliation/transactions/${id}/exclude`,
    summary: (bankAccountId: string) => `/finance/bank-reconciliation/accounts/${bankAccountId}/summary`,
  },
  // Settings
  settings: {
    organization: '/settings/organization',
  },
  // Tenant
  tenant: {
    get: (id: string) => `/tenants/${id}`,
    update: (id: string) => `/tenants/${id}`,
    settings: (id: string) => `/tenants/${id}/settings`,
  },
  // ESS (Employee Self-Service)
  ess: {
    profile: '/ess/profile',
    attendance: {
      today: '/ess/attendance/today',
      me: '/ess/attendance/me',
      checkIn: '/ess/attendance/check-in',
      checkOut: '/ess/attendance/check-out',
    },
    leave: {
      balance: '/ess/leave/balance',
      applications: '/ess/leave/applications',
      teamCalendar: '/ess/leave/team-calendar',
      withdraw: (id: string) => `/ess/leave/applications/${id}/withdraw`,
    },
    payroll: {
      entries: '/ess/payroll/entries',
      pdf: (id: string) => `/ess/payroll/entries/${id}/pdf`,
    },
    expenses: '/ess/expenses',
    team: '/ess/team',
    dashboard: '/ess/dashboard',
  },

  // ─── Settings: tax rates, TDS sections, currencies, fiscal periods ───
  taxRates: {
    list: '/finance/tax-rates',
    get: (id: string) => `/finance/tax-rates/${id}`,
    create: '/finance/tax-rates',
    update: (id: string) => `/finance/tax-rates/${id}`,
    deactivate: (id: string) => `/finance/tax-rates/${id}/deactivate`,
    seedGst: '/finance/tax-rates/seed-gst',
  },
  currencies: {
    list: '/finance/currencies',
    get: (id: string) => `/finance/currencies/${id}`,
    create: '/finance/currencies',
    update: (id: string) => `/finance/currencies/${id}`,
    delete: (id: string) => `/finance/currencies/${id}`,
    rates: '/finance/currencies/exchange-rates',
    exchangeRates: '/finance/currencies/exchange-rates',
    addRate: '/finance/currencies/exchange-rates',
    setExchangeRate: '/finance/currencies/exchange-rates',
  },

  designations: {
    list: '/hr/designations',
    get: (id: string) => `/hr/designations/${id}`,
    create: '/hr/designations',
    update: (id: string) => `/hr/designations/${id}`,
    delete: (id: string) => `/hr/designations/${id}`,
  },
  fiscalPeriods: {
    list: '/finance/fiscal-periods',
    get: (id: string) => `/finance/fiscal-periods/${id}`,
    create: '/finance/fiscal-periods',
    update: (id: string) => `/finance/fiscal-periods/${id}`,
    close: (id: string) => `/finance/fiscal-periods/${id}/close`,
    reopen: (id: string) => `/finance/fiscal-periods/${id}/reopen`,
    lock: (id: string) => `/finance/fiscal-periods/${id}/lock`,
  },
  recurringInvoices: {
    list: '/finance/recurring-invoices',
    get: (id: string) => `/finance/recurring-invoices/${id}`,
    create: '/finance/recurring-invoices',
    update: (id: string) => `/finance/recurring-invoices/${id}`,
    deactivate: (id: string) => `/finance/recurring-invoices/${id}/deactivate`,
  },

  // ─── Audit / security events / retention ───
  audit: {
    list: '/audit',
    get: (id: string) => `/audit/${id}`,
  },
  securityEvents: {
    list: '/audit/security-events',
  },
  retentionPolicies: {
    list: '/retention/policies',
    get: (id: string) => `/retention/policies/${id}`,
    create: '/retention/policies',
    update: (id: string) => `/retention/policies/${id}`,
    delete: (id: string) => `/retention/policies/${id}`,
  },
  legalHolds: {
    list: '/retention/legal-holds',
    get: (id: string) => `/retention/legal-holds/${id}`,
    create: '/retention/legal-holds',
    release: (id: string) => `/retention/legal-holds/${id}/release`,
  },

  // ─── HR personal data: education, experience, family, skills ───
  employeeEducation: {
    list: '/hr/employee-education',
    get: (id: string) => `/hr/employee-education/${id}`,
    create: '/hr/employee-education',
    update: (id: string) => `/hr/employee-education/${id}`,
    delete: (id: string) => `/hr/employee-education/${id}`,
    mine: '/ess/education',
    mineUpdate: (id: string) => `/ess/education/${id}`,
    mineDelete: (id: string) => `/ess/education/${id}`,
  },
  employeeExperience: {
    list: '/hr/employee-experience',
    get: (id: string) => `/hr/employee-experience/${id}`,
    create: '/hr/employee-experience',
    update: (id: string) => `/hr/employee-experience/${id}`,
    delete: (id: string) => `/hr/employee-experience/${id}`,
    mine: '/ess/experience',
    mineUpdate: (id: string) => `/ess/experience/${id}`,
    mineDelete: (id: string) => `/ess/experience/${id}`,
  },
  employeeFamily: {
    list: '/hr/employee-family',
    get: (id: string) => `/hr/employee-family/${id}`,
    create: '/hr/employee-family',
    update: (id: string) => `/hr/employee-family/${id}`,
    delete: (id: string) => `/hr/employee-family/${id}`,
    mine: '/ess/family',
    mineUpdate: (id: string) => `/ess/family/${id}`,
    mineDelete: (id: string) => `/ess/family/${id}`,
  },
  employeeSkills: {
    list: '/hr/employee-skills',
    get: (id: string) => `/hr/employee-skills/${id}`,
    create: '/hr/employee-skills',
    update: (id: string) => `/hr/employee-skills/${id}`,
    delete: (id: string) => `/hr/employee-skills/${id}`,
    mine: '/ess/skills',
    mineUpdate: (id: string) => `/ess/skills/${id}`,
    mineDelete: (id: string) => `/ess/skills/${id}`,
  },
};

export default api;
