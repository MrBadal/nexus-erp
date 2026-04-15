// ─── Cross-Module Event Constants ───────────────────────────────────────────
// All EventEmitter2 event names used across NexusERP modules.
// Import from here — never hardcode event strings in services.

export const EVENTS = {
  // ── Finance ──────────────────────────────────────────────────────────────
  INVOICE_CONFIRMED: 'invoice.confirmed',
  INVOICE_SEND: 'invoice.send',
  INVOICE_PAYMENT_RECORDED: 'invoice.payment_recorded',
  // JOURNAL_POSTED and JOURNAL_REVERSED reserved for future audit/reconciliation hooks

  // ── Buying → Inventory + Finance ─────────────────────────────────────────
  PURCHASE_RECEIPT_COMPLETED: 'purchase.receipt.completed',

  // ── HR → Finance ─────────────────────────────────────────────────────────
  PAYROLL_ENTRY_APPROVED: 'payroll.entry.approved',

  // ── Selling → Inventory + Finance ────────────────────────────────────────
  SALES_ORDER_CONFIRMED: 'sales.order.confirmed',
  DELIVERY_NOTE_COMPLETED: 'delivery.note.completed',

  // ── Manufacturing → Inventory + Finance ──────────────────────────────────
  WORK_ORDER_COMPLETED: 'manufacturing.work_order.completed',

  // ── Construction → Finance + Inventory ───────────────────────────────────
  RA_BILL_CERTIFIED: 'construction.ra_bill.certified',
  WORK_ORDER_PAYMENT_APPROVED: 'construction.work_order.payment_approved',
  SITE_GRN_COMPLETED: 'construction.site_grn.completed',
  SITE_MATERIAL_ISSUE_ISSUED: 'construction.site_material_issue.issued',
  // ── Selling → CRM ───────────────────────────────────────────────────────
  CUSTOMER_CREATED: 'selling.customer.created',

  // ── Buying → CRM ──────────────────────────────────────────────────────
  SUPPLIER_CREATED: 'buying.supplier.created',

  // ── HR → Attendance ──────────────────────────────────────────────────
  LEAVE_APPROVED: 'hr.leave.approved',

  // ── Helpdesk → Notifications ─────────────────────────
  TICKET_SLA_BREACHED: 'ticket.sla.breached',

  // ── Approval Workflow ────────────────────────────────
  APPROVAL_COMPLETED: 'APPROVAL_COMPLETED',
  APPROVAL_REJECTED: 'APPROVAL_REJECTED',

  // ── Quality → Inventory ──────────────────────────────
  INSPECTION_REJECTED: 'inspection.rejected',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
