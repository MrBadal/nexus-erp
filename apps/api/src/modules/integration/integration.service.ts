import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, and, isNull, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  accounts,
  invoices,
  invoiceLines,
  journalEntries,
  journalLines,
  purchaseOrders,
  purchaseReceipts,
  purchaseReceiptLines,
  materialRequests,
  bills,
  payrollEntries,
  payrollEntryComponents,
  salaryComponents,
  items,
  itemWarehouses,
  stockMovements,
  suppliers,
  warehouses,
  bomItems,
  customers,
  contacts,
  attendanceRecords,
} from '../../database/schema/index.js';
import { EVENTS } from '../../common/events.constants.js';

// ─── Event Payload Interfaces ────────────────────────────────────────────────

interface InvoiceConfirmedPayload {
  invoiceId: string;
  tenantId: string;
  invoiceNumber: string;
}

interface PurchaseReceiptCompletedPayload {
  receiptId: string;
  tenantId: string;
  receiptNumber: string;
  supplierId: string;
  warehouseId: string;
  lines: { itemId: string; acceptedQty: string; unitCost?: string }[];
}

interface PayrollEntryApprovedPayload {
  entryId: string;
  tenantId: string;
  employeeId: string;
  period: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  components: { componentCode: string; componentType: string; amount: string }[];
}

interface CustomerCreatedPayload {
  tenantId: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  company: string | null;
}

interface SupplierCreatedPayload {
  tenantId: string;
  supplierId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  contactPerson: string | null;
}

interface LeaveApprovedPayload {
  tenantId: string;
  applicationId: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
}

// ─── Integration Service ─────────────────────────────────────────────────────

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE: Invoice Confirmed → AR Journal Entry
  // DR: Accounts Receivable | CR: Sales Revenue + Tax Payable
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.INVOICE_CONFIRMED)
  async onInvoiceConfirmed(payload: InvoiceConfirmedPayload) {
    this.logger.log(`Posting AR journal for invoice ${payload.invoiceNumber}`);
    try {
      const invoice = await this.db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, payload.invoiceId), eq(invoices.tenantId, payload.tenantId)))
        .limit(1)
        .then((r) => r[0]);

      if (!invoice) return;

      // Skip if journal already posted
      if (invoice.journalEntryId) return;

      const lines = await this.db
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, payload.invoiceId));

      const arAccount = await this.findAccountByPattern(payload.tenantId, 'asset', [
        'Accounts Receivable',
        'Trade Receivable',
        'Debtors',
      ]);
      const revenueAccount = await this.findAccountByPattern(payload.tenantId, 'revenue', [
        'Sales Revenue',
        'Service Revenue',
        'Revenue',
      ]);

      if (!arAccount || !revenueAccount) {
        this.logger.warn(
          `Cannot post AR journal for ${payload.invoiceNumber}: default accounts not found. ` +
            `Create "Accounts Receivable" (asset) and "Sales Revenue" (revenue) accounts.`,
        );
        return;
      }

      const total = parseFloat(invoice.total);
      const taxAmount = parseFloat(invoice.taxAmount || '0');
      const subtotal = total - taxAmount;

      const entryLines: { accountId: string; description: string; debitAmount: string; creditAmount: string }[] = [
        {
          accountId: arAccount.id,
          description: `AR - ${payload.invoiceNumber}`,
          debitAmount: total.toFixed(4),
          creditAmount: '0',
        },
        {
          accountId: revenueAccount.id,
          description: `Revenue - ${payload.invoiceNumber}`,
          debitAmount: '0',
          creditAmount: subtotal.toFixed(4),
        },
      ];

      // Add tax line if applicable
      if (taxAmount > 0) {
        const taxAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
          'GST Payable',
          'Tax Payable',
          'Output Tax',
          'Sales Tax',
        ]);
        if (taxAccount) {
          entryLines.push({
            accountId: taxAccount.id,
            description: `GST/Tax - ${payload.invoiceNumber}`,
            debitAmount: '0',
            creditAmount: taxAmount.toFixed(4),
          });
        } else {
          // Merge tax into revenue if no tax account found
          entryLines[1].creditAmount = total.toFixed(4);
          entryLines.splice(2, 1);
        }
      }

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId: payload.tenantId,
          entryNumber: await this.generateJournalNumber(payload.tenantId),
          date: invoice.issueDate,
          description: `AR Invoice - ${payload.invoiceNumber}`,
          sourceType: 'invoice',
          sourceId: payload.invoiceId,
          reference: payload.invoiceNumber,
          status: 'posted',
          currencyCode: invoice.currencyCode || 'INR',
          exchangeRate: invoice.exchangeRate || '1',
          createdBy: invoice.createdBy,
        })
        .returning();

      await this.db.insert(journalLines).values(
        entryLines.map((l, i) => ({
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: i + 1,
          accountId: l.accountId,
          description: l.description,
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
        })),
      );

      // Update account balances
      for (const l of entryLines) {
        await this.updateAccountBalance(l.accountId, l.debitAmount, l.creditAmount);
      }

      // Link journal entry back to invoice
      await this.db
        .update(invoices)
        .set({ journalEntryId: entry.id } as any)
        .where(eq(invoices.id, payload.invoiceId));

      this.logger.log(`AR journal ${entry.entryNumber} posted for invoice ${payload.invoiceNumber}`);
    } catch (err) {
      this.logger.error(`Failed to post AR journal for ${payload.invoiceNumber}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUYING → INVENTORY: GRN Completed → Update Stock + AP Accrual
  // Stock: increase itemWarehouses qty + create stockMovement
  // Finance: DR Inventory Asset | CR Accounts Payable
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.PURCHASE_RECEIPT_COMPLETED)
  async onPurchaseReceiptCompleted(payload: PurchaseReceiptCompletedPayload) {
    this.logger.log(`Processing GRN ${payload.receiptNumber} — updating stock + posting AP accrual`);
    try {
      // ── 1. Update inventory stock ─────────────────────────────────────────
      for (const line of payload.lines) {
        const qty = parseFloat(line.acceptedQty);
        if (qty <= 0) continue;

        // Upsert itemWarehouses
        const [existing] = await this.db
          .select()
          .from(itemWarehouses)
          .where(
            and(
              eq(itemWarehouses.itemId, line.itemId),
              eq(itemWarehouses.warehouseId, payload.warehouseId),
            ),
          )
          .limit(1);

        if (existing) {
          const newQty = (parseFloat(existing.quantity) + qty).toFixed(4);
          await this.db
            .update(itemWarehouses)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(itemWarehouses.id, existing.id));
        } else {
          await this.db.insert(itemWarehouses).values({
            tenantId: payload.tenantId,
            itemId: line.itemId,
            warehouseId: payload.warehouseId,
            quantity: qty.toFixed(4),
            reservedQuantity: '0',
            reorderLevel: 0,
          });
        }

        // Create stock movement record
        await this.db.insert(stockMovements).values({
          tenantId: payload.tenantId,
          itemId: line.itemId,
          warehouseId: payload.warehouseId,
          movementType: 'receipt',
          quantity: qty.toFixed(4),
          unitCost: line.unitCost || null,
          reference: payload.receiptNumber,
          description: `GRN from ${payload.receiptNumber}`,
          sourceType: 'purchase_receipt',
          sourceId: payload.receiptId,
        });

        // Update weighted average valuation rate
        const unitCost = parseFloat(line.unitCost || '0');
        if (unitCost > 0) {
          const [currentIw] = await this.db
            .select({
              quantity: itemWarehouses.quantity,
              valuationRate: itemWarehouses.valuationRate,
            })
            .from(itemWarehouses)
            .where(
              and(
                eq(itemWarehouses.itemId, line.itemId),
                eq(itemWarehouses.warehouseId, payload.warehouseId),
                eq(itemWarehouses.tenantId, payload.tenantId),
              ),
            )
            .limit(1);

          if (currentIw) {
            const existingQty = parseFloat(currentIw.quantity) - qty; // qty was already added above
            const existingRate = parseFloat(currentIw.valuationRate);
            const totalQty = existingQty + qty;
            const newRate =
              totalQty > 0
                ? ((existingQty * existingRate) + (qty * unitCost)) / totalQty
                : unitCost;

            await this.db
              .update(itemWarehouses)
              .set({ valuationRate: newRate.toFixed(4), updatedAt: new Date() })
              .where(
                and(
                  eq(itemWarehouses.itemId, line.itemId),
                  eq(itemWarehouses.warehouseId, payload.warehouseId),
                  eq(itemWarehouses.tenantId, payload.tenantId),
                ),
              );

            this.logger.debug(
              `Valuation updated: item=${line.itemId}, rate=${newRate.toFixed(4)}`,
            );
          }
        }
      }

      // ── 2. Post AP accrual journal entry ──────────────────────────────────
      const receipt = await this.db
        .select()
        .from(purchaseReceipts)
        .where(
          and(
            eq(purchaseReceipts.id, payload.receiptId),
            eq(purchaseReceipts.tenantId, payload.tenantId),
          ),
        )
        .limit(1)
        .then((r) => r[0]);

      if (!receipt) return;

      // Calculate total value (qty × purchase price for each item)
      let totalValue = 0;
      for (const line of payload.lines) {
        const qty = parseFloat(line.acceptedQty);
        if (qty <= 0) continue;
        const unitCost = parseFloat(line.unitCost || '0');
        totalValue += qty * unitCost;
      }

      if (totalValue <= 0) {
        this.logger.warn(`GRN ${payload.receiptNumber}: total value is 0, skipping AP journal`);
        return;
      }

      const inventoryAccount = await this.findAccountByPattern(payload.tenantId, 'asset', [
        'Inventory',
        'Stock in Hand',
        'Raw Material',
      ]);
      const apAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
        'Accounts Payable',
        'Trade Payable',
        'Creditors',
      ]);

      if (!inventoryAccount || !apAccount) {
        this.logger.warn(
          `Cannot post AP journal for GRN ${payload.receiptNumber}: default accounts not found.`,
        );
        return;
      }

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId: payload.tenantId,
          entryNumber: await this.generateJournalNumber(payload.tenantId),
          date: receipt.receiptDate,
          description: `GRN Accrual - ${payload.receiptNumber}`,
          sourceType: 'bill',
          sourceId: payload.receiptId,
          reference: payload.receiptNumber,
          status: 'posted',
          currencyCode: 'INR',
          exchangeRate: '1',
        })
        .returning();

      const jLines = [
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: inventoryAccount.id,
          description: `Inventory receipt - ${payload.receiptNumber}`,
          debitAmount: totalValue.toFixed(4),
          creditAmount: '0',
        },
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 2,
          accountId: apAccount.id,
          description: `AP accrual - ${payload.receiptNumber}`,
          debitAmount: '0',
          creditAmount: totalValue.toFixed(4),
        },
      ];

      await this.db.insert(journalLines).values(jLines);

      for (const l of jLines) {
        await this.updateAccountBalance(l.accountId, l.debitAmount, l.creditAmount);
      }

      this.logger.log(`AP accrual journal ${entry.entryNumber} posted for GRN ${payload.receiptNumber}`);
    } catch (err) {
      this.logger.error(`Failed to process GRN ${payload.receiptNumber}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HR PAYROLL → FINANCE: Payroll Approved → GL Payroll Expense Journal
  // DR: Salary Expense (gross) | CR: Net Salary Payable + EPF Payable +
  //     ESIC Payable + TDS Payable + Professional Tax Payable
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.PAYROLL_ENTRY_APPROVED)
  async onPayrollEntryApproved(payload: PayrollEntryApprovedPayload) {
    this.logger.log(`Posting payroll GL journal for entry ${payload.entryId} — period ${payload.period}`);
    try {
      const grossPay = parseFloat(payload.grossPay);
      const netPay = parseFloat(payload.netPay);

      if (grossPay <= 0) return;

      const salaryExpenseAccount = await this.findAccountByPattern(payload.tenantId, 'expense', [
        'Salary',
        'Salaries',
        'Employee Compensation',
        'Payroll Expense',
      ]);
      const salaryPayableAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
        'Salary Payable',
        'Salaries Payable',
        'Net Salary Payable',
        'Employee Payable',
      ]);

      if (!salaryExpenseAccount || !salaryPayableAccount) {
        this.logger.warn(
          `Cannot post payroll journal for ${payload.entryId}: default accounts not found. ` +
            `Create "Salary Expense" and "Salary Payable" accounts.`,
        );
        return;
      }

      // Build deduction lines
      const creditLines: { accountId: string; description: string; amount: number }[] = [];

      // Find specific deduction accounts for statutory liabilities
      const epfAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
        'EPF Payable',
        'Provident Fund',
        'PF Payable',
      ]);
      const esicAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
        'ESIC Payable',
        'ESI Payable',
        'Employee State Insurance',
      ]);
      const tdsAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
        'TDS Payable',
        'Tax Deducted at Source',
        'Income Tax Payable',
      ]);
      const ptAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
        'Professional Tax Payable',
        'PT Payable',
      ]);

      let remainingCredit = grossPay;

      for (const comp of payload.components) {
        if (comp.componentType !== 'deduction') continue;
        const amt = parseFloat(comp.amount);
        if (amt <= 0) continue;

        const code = comp.componentCode.toUpperCase();
        let account = null;

        if (code.includes('EPF') || code.includes('PF')) account = epfAccount;
        else if (code.includes('ESIC') || code.includes('ESI')) account = esicAccount;
        else if (code.includes('TDS') || code.includes('TAX')) account = tdsAccount;
        else if (code.includes('PT') || code.includes('PROFESSIONAL')) account = ptAccount;

        if (account) {
          creditLines.push({ accountId: account.id, description: `${comp.componentCode} - ${payload.period}`, amount: amt });
          remainingCredit -= amt;
        }
      }

      // Net salary payable (net pay goes to salary payable)
      creditLines.push({
        accountId: salaryPayableAccount.id,
        description: `Net Salary Payable - ${payload.period}`,
        amount: remainingCredit,
      });

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId: payload.tenantId,
          entryNumber: await this.generateJournalNumber(payload.tenantId),
          date: `${payload.period}-01`,
          description: `Payroll Journal - ${payload.period}`,
          sourceType: 'adjustment',
          sourceId: payload.entryId,
          reference: `PAYROLL-${payload.period}`,
          status: 'posted',
          currencyCode: 'INR',
          exchangeRate: '1',
        })
        .returning();

      const jLines = [
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: salaryExpenseAccount.id,
          description: `Gross Salary - ${payload.period}`,
          debitAmount: grossPay.toFixed(4),
          creditAmount: '0',
        },
        ...creditLines.map((l, i) => ({
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: i + 2,
          accountId: l.accountId,
          description: l.description,
          debitAmount: '0',
          creditAmount: l.amount.toFixed(4),
        })),
      ];

      await this.db.insert(journalLines).values(jLines);

      for (const l of jLines) {
        await this.updateAccountBalance(l.accountId, l.debitAmount, l.creditAmount);
      }

      // Link journal to payroll entry
      await this.db
        .update(payrollEntries)
        .set({ journalEntryId: entry.id } as any)
        .where(eq(payrollEntries.id, payload.entryId));

      this.logger.log(`Payroll journal ${entry.entryNumber} posted for period ${payload.period}`);
    } catch (err) {
      this.logger.error(`Failed to post payroll journal for ${payload.entryId}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTION: RA Bill Certified → AR Invoice + Finance GL
  // DR: Accounts Receivable | CR: Construction Revenue + GST Payable
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.RA_BILL_CERTIFIED)
  async onRaBillCertified(payload: {
    billId: string; tenantId: string; billNumber: string;
    contractId: string; clientName: string; billDate: string;
    currentBillAmount: string; gstAmount: string; retentionAmount: string;
    netPayable: string; userId: string;
  }) {
    this.logger.log(`Posting AR journal for RA Bill ${payload.billNumber}`);
    try {
      const arAccount = await this.findAccountByPattern(payload.tenantId, 'asset', [
        'Accounts Receivable', 'Trade Receivable', 'Debtors',
      ]);
      const revenueAccount = await this.findAccountByPattern(payload.tenantId, 'revenue', [
        'Construction Revenue', 'Contract Revenue', 'Sales Revenue', 'Revenue',
      ]);

      if (!arAccount || !revenueAccount) {
        this.logger.warn(`Cannot post RA Bill journal for ${payload.billNumber}: accounts not found`);
        return;
      }

      const billAmount = parseFloat(payload.currentBillAmount);
      const gstAmount = parseFloat(payload.gstAmount);
      const totalAR = billAmount + gstAmount;

      const jLineValues: { accountId: string; description: string; debitAmount: string; creditAmount: string }[] = [
        { accountId: arAccount.id, description: `AR - RA Bill ${payload.billNumber}`, debitAmount: totalAR.toFixed(4), creditAmount: '0' },
        { accountId: revenueAccount.id, description: `Revenue - RA Bill ${payload.billNumber}`, debitAmount: '0', creditAmount: billAmount.toFixed(4) },
      ];

      if (gstAmount > 0) {
        const gstAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
          'GST Payable', 'Output Tax', 'Tax Payable',
        ]);
        if (gstAccount) {
          jLineValues.push({ accountId: gstAccount.id, description: `GST (Works Contract) - ${payload.billNumber}`, debitAmount: '0', creditAmount: gstAmount.toFixed(4) });
        } else {
          jLineValues[1].creditAmount = totalAR.toFixed(4);
        }
      }

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId: payload.tenantId,
          entryNumber: await this.generateJournalNumber(payload.tenantId),
          date: payload.billDate,
          description: `RA Bill AR - ${payload.billNumber}`,
          sourceType: 'invoice',
          sourceId: payload.billId,
          reference: payload.billNumber,
          status: 'posted',
          currencyCode: 'INR',
          exchangeRate: '1',
          createdBy: payload.userId,
        })
        .returning();

      await this.db.insert(journalLines).values(
        jLineValues.map((l, i) => ({
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: i + 1,
          accountId: l.accountId,
          description: l.description,
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
        })),
      );

      for (const l of jLineValues) {
        await this.updateAccountBalance(l.accountId, l.debitAmount, l.creditAmount);
      }

      this.logger.log(`AR journal ${entry.entryNumber} posted for RA Bill ${payload.billNumber}`);
    } catch (err) {
      this.logger.error(`Failed to post RA Bill journal for ${payload.billNumber}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTION: Work Order Payment Approved → AP + TDS journal
  // DR: Subcontractor Expense | CR: AP + TDS Payable + Retention Payable
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.WORK_ORDER_PAYMENT_APPROVED)
  async onWorkOrderPaymentApproved(payload: {
    paymentId: string; tenantId: string; paymentNumber: string;
    vendorName: string; vendorPan?: string; tdsSection?: string;
    grossAmount: string; gstAmount: string; tdsAmount: string;
    retentionAmount: string; netPayable: string; paymentDate: string; userId: string;
  }) {
    this.logger.log(`Posting AP + TDS journal for work order payment ${payload.paymentNumber}`);
    try {
      const expenseAccount = await this.findAccountByPattern(payload.tenantId, 'expense', [
        'Subcontractor', 'Contract Expense', 'Construction Expense', 'Cost of Construction',
      ]);
      const apAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
        'Accounts Payable', 'Trade Payable', 'Creditors',
      ]);
      const tdsAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
        'TDS Payable', 'Tax Deducted at Source',
      ]);

      if (!expenseAccount || !apAccount) {
        this.logger.warn(`Cannot post WO payment journal for ${payload.paymentNumber}: accounts not found`);
        return;
      }

      const grossAmount = parseFloat(payload.grossAmount);
      const tdsAmount = parseFloat(payload.tdsAmount);
      const retentionAmount = parseFloat(payload.retentionAmount);
      const netPayable = parseFloat(payload.netPayable);

      const debitLines = [
        { accountId: expenseAccount.id, description: `Subcontractor cost - ${payload.paymentNumber}`, debitAmount: grossAmount.toFixed(4), creditAmount: '0' },
      ];

      const creditLines: { accountId: string; description: string; debitAmount: string; creditAmount: string }[] = [
        { accountId: apAccount.id, description: `AP - ${payload.paymentNumber} - ${payload.vendorName}`, debitAmount: '0', creditAmount: netPayable.toFixed(4) },
      ];

      if (tdsAmount > 0 && tdsAccount) {
        creditLines.push({
          accountId: tdsAccount.id,
          description: `TDS u/s ${payload.tdsSection || '194C'} - ${payload.vendorName} - ${payload.vendorPan || 'N/A'}`,
          debitAmount: '0',
          creditAmount: tdsAmount.toFixed(4),
        });
      }

      if (retentionAmount > 0) {
        const retentionAccount = await this.findAccountByPattern(payload.tenantId, 'liability', [
          'Retention Payable', 'Security Deposit',
        ]);
        if (retentionAccount) {
          creditLines.push({
            accountId: retentionAccount.id,
            description: `Retention held - ${payload.paymentNumber}`,
            debitAmount: '0',
            creditAmount: retentionAmount.toFixed(4),
          });
        }
      }

      const allLines = [...debitLines, ...creditLines];

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId: payload.tenantId,
          entryNumber: await this.generateJournalNumber(payload.tenantId),
          date: payload.paymentDate,
          description: `WO Payment - ${payload.paymentNumber}`,
          sourceType: 'payment',
          sourceId: payload.paymentId,
          reference: payload.paymentNumber,
          status: 'posted',
          currencyCode: 'INR',
          exchangeRate: '1',
          createdBy: payload.userId,
        })
        .returning();

      await this.db.insert(journalLines).values(
        allLines.map((l, i) => ({
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: i + 1,
          accountId: l.accountId,
          description: l.description,
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
        })),
      );

      for (const l of allLines) {
        await this.updateAccountBalance(l.accountId, l.debitAmount, l.creditAmount);
      }

      this.logger.log(`AP+TDS journal ${entry.entryNumber} posted for WO payment ${payload.paymentNumber}`);
    } catch (err) {
      this.logger.error(`Failed to post WO payment journal for ${payload.paymentNumber}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTION: Site GRN Completed → Inventory + Accrual Journal
  // Same as regular GRN but tagged to construction site warehouse
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.SITE_GRN_COMPLETED)
  async onSiteGrnCompleted(payload: {
    grnId: string; tenantId: string; grnNumber: string;
    contractId: string; warehouseId: string; totalValue: string;
    lines: { itemId: string; acceptedQty: string; unitCost: string }[];
  }) {
    // Re-use the same logic as purchase receipt completion (inventory update + AP accrual)
    await this.onPurchaseReceiptCompleted({
      receiptId: payload.grnId,
      tenantId: payload.tenantId,
      receiptNumber: payload.grnNumber,
      supplierId: '',
      warehouseId: payload.warehouseId || '',
      lines: payload.lines,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTION: Site Material Issue Approved → Reduce Inventory + WIP Journal
  // Stock: decrease itemWarehouses qty + create stockMovement (issue)
  // Finance: DR Construction WIP | CR Inventory Asset
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.SITE_MATERIAL_ISSUE_ISSUED)
  async onSiteMaterialIssueIssued(payload: {
    issueId: string;
    tenantId: string;
    contractId: string;
    warehouseId: string;
    totalValue: string;
    lines: Array<{ itemId: string; quantityIssued: string; unitRate: string; amount: string }>;
  }) {
    this.logger.log(`Processing site material issue ${payload.issueId} — reducing stock + posting WIP journal`);
    try {
      // ── 1. Reduce inventory stock for each line item ───────────────────────
      for (const line of payload.lines) {
        const qty = parseFloat(line.quantityIssued);
        if (qty <= 0) continue;

        await this.db
          .update(itemWarehouses)
          .set({
            quantity: sql`${itemWarehouses.quantity} - ${qty}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(itemWarehouses.itemId, line.itemId),
              eq(itemWarehouses.warehouseId, payload.warehouseId),
            ),
          );

        // Stock movement record
        await this.db.insert(stockMovements).values({
          tenantId: payload.tenantId,
          itemId: line.itemId,
          warehouseId: payload.warehouseId,
          movementType: 'issue',
          quantity: (-qty).toFixed(4),
          unitCost: line.unitRate,
          reference: payload.issueId,
          description: 'Site material issued to work area',
          sourceType: 'site_material_issue',
          sourceId: payload.issueId,
        });
      }

      // ── 2. Post job cost GL journal: DR Construction WIP / CR Inventory Asset
      const totalValue = parseFloat(payload.totalValue);
      if (totalValue <= 0) {
        this.logger.warn(`Site material issue ${payload.issueId}: total value is 0, skipping WIP journal`);
        return;
      }

      const wipAccount = await this.findAccountByPattern(payload.tenantId, 'asset', [
        'Construction WIP',
        'Work in Progress',
        'WIP',
      ]);
      const inventoryAccount = await this.findAccountByPattern(payload.tenantId, 'asset', [
        'Inventory',
        'Stock in Hand',
        'Raw Material',
      ]);

      if (!wipAccount || !inventoryAccount) {
        this.logger.warn(
          `Cannot post WIP journal for site material issue ${payload.issueId}: accounts not found. ` +
            `Create "Construction WIP" (asset) and "Inventory" (asset) accounts.`,
        );
        return;
      }

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId: payload.tenantId,
          entryNumber: await this.generateJournalNumber(payload.tenantId),
          date: new Date().toISOString().split('T')[0],
          description: `Site material issued to work area`,
          sourceType: 'adjustment',
          sourceId: payload.issueId,
          reference: payload.issueId,
          status: 'posted',
          currencyCode: 'INR',
          exchangeRate: '1',
        })
        .returning();

      const jLines = [
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: wipAccount.id,
          description: 'Construction WIP — materials issued',
          debitAmount: totalValue.toFixed(4),
          creditAmount: '0',
        },
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 2,
          accountId: inventoryAccount.id,
          description: 'Inventory — materials consumed',
          debitAmount: '0',
          creditAmount: totalValue.toFixed(4),
        },
      ];

      await this.db.insert(journalLines).values(jLines);

      for (const l of jLines) {
        await this.updateAccountBalance(l.accountId, l.debitAmount, l.creditAmount);
      }

      this.logger.log(`WIP journal ${entry.entryNumber} posted for site material issue ${payload.issueId}`);
    } catch (err) {
      this.logger.error(`Failed to process site material issue ${payload.issueId}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELLING: Delivery Note Delivered → Reduce Inventory + COGS Journal
  // Stock: decrease itemWarehouses qty + create stockMovement (shipment)
  // Finance: DR Cost of Goods Sold | CR Inventory Asset
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.DELIVERY_NOTE_COMPLETED)
  async onDeliveryNoteCompleted(payload: {
    noteId: string;
    tenantId: string;
    deliveryNumber: string;
    customerId: string;
    deliveryDate: string;
    lines: { itemId: string; quantity: string }[];
  }) {
    this.logger.log(`Processing delivery note ${payload.deliveryNumber} — reducing stock + posting COGS journal`);
    try {
      // ── 1. Find default warehouse for this tenant ──────────────────────────
      const [defaultWarehouse] = await this.db
        .select()
        .from(warehouses)
        .where(and(eq(warehouses.tenantId, payload.tenantId), isNull(warehouses.deletedAt)))
        .limit(1);

      if (!defaultWarehouse) {
        this.logger.warn(`Cannot process delivery ${payload.deliveryNumber}: no warehouse found for tenant`);
        return;
      }

      // ── 2. Reduce inventory + calculate total COGS value ──────────────────
      let totalCogsValue = 0;

      for (const line of payload.lines) {
        const qty = parseFloat(line.quantity);
        if (qty <= 0) continue;

        // Get item cost for COGS calculation
        const [item] = await this.db
          .select()
          .from(items)
          .where(and(eq(items.id, line.itemId), eq(items.tenantId, payload.tenantId)))
          .limit(1);

        const unitCost = item ? parseFloat(item.purchasePrice || '0') : 0;
        totalCogsValue += qty * unitCost;

        // Reduce stock
        await this.db
          .update(itemWarehouses)
          .set({
            quantity: sql`GREATEST(0, ${itemWarehouses.quantity} - ${qty})`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(itemWarehouses.itemId, line.itemId),
              eq(itemWarehouses.warehouseId, defaultWarehouse.id),
            ),
          );

        // Stock movement record
        await this.db.insert(stockMovements).values({
          tenantId: payload.tenantId,
          itemId: line.itemId,
          warehouseId: defaultWarehouse.id,
          movementType: 'issue',
          quantity: (-qty).toFixed(4),
          unitCost: unitCost > 0 ? unitCost.toFixed(4) : null,
          reference: payload.deliveryNumber,
          description: `Shipment — ${payload.deliveryNumber}`,
          sourceType: 'delivery_note',
          sourceId: payload.noteId,
        });
      }

      // ── 3. Post COGS journal if we have cost data ──────────────────────────
      if (totalCogsValue <= 0) {
        this.logger.warn(`Delivery ${payload.deliveryNumber}: no item costs found, skipping COGS journal`);
        return;
      }

      const cogsAccount = await this.findAccountByPattern(payload.tenantId, 'expense', [
        'Cost of Goods Sold',
        'COGS',
        'Cost of Sales',
      ]);
      const inventoryAccount = await this.findAccountByPattern(payload.tenantId, 'asset', [
        'Inventory',
        'Stock in Hand',
        'Finished Goods',
      ]);

      if (!cogsAccount || !inventoryAccount) {
        this.logger.warn(`Cannot post COGS journal for ${payload.deliveryNumber}: accounts not found`);
        return;
      }

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId: payload.tenantId,
          entryNumber: await this.generateJournalNumber(payload.tenantId),
          date: payload.deliveryDate,
          description: `COGS — ${payload.deliveryNumber}`,
          sourceType: 'invoice',
          sourceId: payload.noteId,
          reference: payload.deliveryNumber,
          status: 'posted',
          currencyCode: 'INR',
          exchangeRate: '1',
        })
        .returning();

      const jLines = [
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: cogsAccount.id,
          description: `COGS — ${payload.deliveryNumber}`,
          debitAmount: totalCogsValue.toFixed(4),
          creditAmount: '0',
        },
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 2,
          accountId: inventoryAccount.id,
          description: `Inventory reduction — ${payload.deliveryNumber}`,
          debitAmount: '0',
          creditAmount: totalCogsValue.toFixed(4),
        },
      ];

      await this.db.insert(journalLines).values(jLines);

      for (const l of jLines) {
        await this.updateAccountBalance(l.accountId, l.debitAmount, l.creditAmount);
      }

      this.logger.log(`COGS journal ${entry.entryNumber} posted for delivery ${payload.deliveryNumber}`);
    } catch (err) {
      this.logger.error(`Failed to process delivery note ${payload.deliveryNumber}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUFACTURING: Work Order Completed → Consume BOM Materials + Add Finished Goods
  // Stock: decrease raw material qty + increase finished goods qty
  // Finance: DR Finished Goods Inventory | CR Raw Material Inventory (WIP)
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.WORK_ORDER_COMPLETED)
  async onWorkOrderCompleted(payload: {
    orderId: string;
    tenantId: string;
    workOrderNumber: string;
    bomId: string;
    finishedItemId: string;
    finishedItemName: string;
    completedQty: string;
    materials: { itemId: string; quantity: string; rate: string }[];
  }) {
    this.logger.log(`Processing work order ${payload.workOrderNumber} completion — consuming BOM materials`);
    try {
      // ── 1. Find default warehouse ──────────────────────────────────────────
      const [defaultWarehouse] = await this.db
        .select()
        .from(warehouses)
        .where(and(eq(warehouses.tenantId, payload.tenantId), isNull(warehouses.deletedAt)))
        .limit(1);

      if (!defaultWarehouse) {
        this.logger.warn(`Cannot process WO ${payload.workOrderNumber}: no warehouse found for tenant`);
        return;
      }

      // ── 2. Consume raw materials ───────────────────────────────────────────
      let totalMaterialCost = 0;

      for (const material of payload.materials) {
        const qty = parseFloat(material.quantity);
        if (qty <= 0) continue;

        const rate = parseFloat(material.rate || '0');
        totalMaterialCost += qty * rate;

        // Reduce raw material stock
        await this.db
          .update(itemWarehouses)
          .set({
            quantity: sql`GREATEST(0, ${itemWarehouses.quantity} - ${qty})`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(itemWarehouses.itemId, material.itemId),
              eq(itemWarehouses.warehouseId, defaultWarehouse.id),
            ),
          );

        // Stock movement: consumption
        await this.db.insert(stockMovements).values({
          tenantId: payload.tenantId,
          itemId: material.itemId,
          warehouseId: defaultWarehouse.id,
          movementType: 'issue',
          quantity: (-qty).toFixed(4),
          unitCost: rate > 0 ? rate.toFixed(4) : null,
          reference: payload.workOrderNumber,
          description: `Manufacturing consumption — ${payload.workOrderNumber}`,
          sourceType: 'work_order',
          sourceId: payload.orderId,
        });
      }

      // ── 3. Add finished goods to inventory ────────────────────────────────
      const completedQty = parseFloat(payload.completedQty);

      const [existingFG] = await this.db
        .select()
        .from(itemWarehouses)
        .where(
          and(
            eq(itemWarehouses.itemId, payload.finishedItemId),
            eq(itemWarehouses.warehouseId, defaultWarehouse.id),
          ),
        )
        .limit(1);

      if (existingFG) {
        await this.db
          .update(itemWarehouses)
          .set({
            quantity: (parseFloat(existingFG.quantity) + completedQty).toFixed(4),
            updatedAt: new Date(),
          })
          .where(eq(itemWarehouses.id, existingFG.id));
      } else {
        await this.db.insert(itemWarehouses).values({
          tenantId: payload.tenantId,
          itemId: payload.finishedItemId,
          warehouseId: defaultWarehouse.id,
          quantity: completedQty.toFixed(4),
          reservedQuantity: '0',
          reorderLevel: 0,
        });
      }

      // Stock movement: production receipt
      await this.db.insert(stockMovements).values({
        tenantId: payload.tenantId,
        itemId: payload.finishedItemId,
        warehouseId: defaultWarehouse.id,
        movementType: 'receipt',
        quantity: completedQty.toFixed(4),
        unitCost: totalMaterialCost > 0 ? (totalMaterialCost / completedQty).toFixed(4) : null,
        reference: payload.workOrderNumber,
        description: `Finished goods produced — ${payload.workOrderNumber}`,
        sourceType: 'work_order',
        sourceId: payload.orderId,
      });

      // ── 4. Post GL journal: DR Finished Goods | CR Raw Material Inventory ─
      if (totalMaterialCost <= 0) {
        this.logger.warn(`WO ${payload.workOrderNumber}: no material costs, skipping GL journal`);
        return;
      }

      const finishedGoodsAccount = await this.findAccountByPattern(payload.tenantId, 'asset', [
        'Finished Goods',
        'Inventory',
        'Stock in Hand',
      ]);
      const rawMaterialAccount = await this.findAccountByPattern(payload.tenantId, 'asset', [
        'Raw Material',
        'Raw Materials',
        'Inventory',
        'Stock in Hand',
      ]);

      if (!finishedGoodsAccount || !rawMaterialAccount) {
        this.logger.warn(`Cannot post production journal for WO ${payload.workOrderNumber}: accounts not found`);
        return;
      }

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId: payload.tenantId,
          entryNumber: await this.generateJournalNumber(payload.tenantId),
          date: new Date().toISOString().split('T')[0],
          description: `Production — ${payload.workOrderNumber} — ${payload.finishedItemName}`,
          sourceType: 'adjustment',
          sourceId: payload.orderId,
          reference: payload.workOrderNumber,
          status: 'posted',
          currencyCode: 'INR',
          exchangeRate: '1',
        })
        .returning();

      const jLines = [
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: finishedGoodsAccount.id,
          description: `Finished goods — ${payload.finishedItemName} (${payload.workOrderNumber})`,
          debitAmount: totalMaterialCost.toFixed(4),
          creditAmount: '0',
        },
        {
          tenantId: payload.tenantId,
          journalEntryId: entry.id,
          lineNumber: 2,
          accountId: rawMaterialAccount.id,
          description: `Raw material consumed — ${payload.workOrderNumber}`,
          debitAmount: '0',
          creditAmount: totalMaterialCost.toFixed(4),
        },
      ];

      await this.db.insert(journalLines).values(jLines);

      for (const l of jLines) {
        await this.updateAccountBalance(l.accountId, l.debitAmount, l.creditAmount);
      }

      this.logger.log(`Production journal ${entry.entryNumber} posted for WO ${payload.workOrderNumber}`);
    } catch (err) {
      this.logger.error(`Failed to process work order completion ${payload.workOrderNumber}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE: Invoice Payment Recorded → Update Customer Outstanding Balance
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.INVOICE_PAYMENT_RECORDED)
  async onInvoicePaymentRecorded(payload: {
    invoiceId: string;
    tenantId: string;
    amount: number;
    newStatus: string;
  }) {
    this.logger.log(`Processing payment of ₹${payload.amount} on invoice ${payload.invoiceId}`);
    try {
      // Get the invoice to find the customer
      const [invoice] = await this.db
        .select({ customerId: invoices.customerId, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.id, payload.invoiceId))
        .limit(1);

      if (!invoice?.customerId) return;

      // Reduce customer outstanding balance
      await this.db
        .update(customers)
        .set({
          outstandingBalance: sql`GREATEST(0, CAST(${customers.outstandingBalance} AS numeric) - ${payload.amount})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(customers.id, invoice.customerId),
            eq(customers.tenantId, payload.tenantId),
          ),
        );

      this.logger.log(
        `Updated customer ${invoice.customerId} outstanding balance after ₹${payload.amount} payment on ${invoice.invoiceNumber}`,
      );
    } catch (err) {
      this.logger.error(`Failed to process payment recorded event: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELLING: Sales Order Confirmed → Reserve Inventory for Fulfillment
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.SALES_ORDER_CONFIRMED)
  async onSalesOrderConfirmed(payload: {
    orderId: string;
    tenantId: string;
    orderNumber: string;
    customerId: string;
    lines: { itemId: string; quantity: string }[];
  }) {
    this.logger.log(`Reserving inventory for SO ${payload.orderNumber}`);
    try {
      for (const line of payload.lines) {
        if (!line.itemId) continue;
        const qty = parseFloat(line.quantity);
        if (qty <= 0) continue;

        // Check item type — only reserve stock items
        const [item] = await this.db
          .select({ itemType: items.itemType })
          .from(items)
          .where(eq(items.id, line.itemId))
          .limit(1);

        if (!item || item.itemType !== 'stock') continue;

        // Find default warehouse
        const [defaultWarehouse] = await this.db
          .select()
          .from(warehouses)
          .where(and(eq(warehouses.tenantId, payload.tenantId), isNull(warehouses.deletedAt)))
          .limit(1);

        if (!defaultWarehouse) continue;

        // Reserve stock by incrementing reservedQuantity
        await this.db
          .update(itemWarehouses)
          .set({
            reservedQuantity: sql`CAST(${itemWarehouses.reservedQuantity} AS numeric) + ${qty}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(itemWarehouses.itemId, line.itemId),
              eq(itemWarehouses.warehouseId, defaultWarehouse.id),
            ),
          );
      }

      this.logger.log(`Inventory reserved for SO ${payload.orderNumber} (${payload.lines.length} lines)`);
    } catch (err) {
      this.logger.error(`Failed to reserve inventory for SO ${payload.orderNumber}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async findAccountByPattern(
    tenantId: string,
    accountType: string,
    namePatterns: string[],
  ) {
    for (const pattern of namePatterns) {
      const [found] = await this.db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.tenantId, tenantId),
            eq(accounts.accountType, accountType as any),
            like(accounts.name, `%${pattern}%`),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1);

      if (found) return found;
    }

    // Fallback: return first active account of this type
    const [fallback] = await this.db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, tenantId),
          eq(accounts.accountType, accountType as any),
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);

    return fallback || null;
  }

  private async updateAccountBalance(
    accountId: string,
    debitAmount: string,
    creditAmount: string,
  ) {
    const debit = parseFloat(debitAmount || '0');
    const credit = parseFloat(creditAmount || '0');

    const [account] = await this.db
      .select({ normalBalance: accounts.normalBalance, currentBalance: accounts.currentBalance })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account) return;

    const bal = parseFloat(account.currentBalance || '0');
    let newBalance: number;

    if (account.normalBalance === 'debit') {
      newBalance = bal + debit - credit;
    } else {
      newBalance = bal + credit - debit;
    }

    await this.db
      .update(accounts)
      .set({ currentBalance: newBalance.toFixed(4), updatedAt: new Date() })
      .where(eq(accounts.id, accountId));
  }

  private async generateJournalNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}-`;

    const [latest] = await this.db
      .select({ entryNumber: journalEntries.entryNumber })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          like(journalEntries.entryNumber, `${prefix}%`),
        ),
      )
      .orderBy(journalEntries.createdAt)
      .limit(1);

    // Count total entries for this year
    const allEntries = await this.db
      .select({ entryNumber: journalEntries.entryNumber })
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.tenantId, tenantId),
          like(journalEntries.entryNumber, `${prefix}%`),
        ),
      );

    const sequence = allEntries.length + 1;
    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELLING → CRM: Customer Created → Auto-create CRM Contact
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.CUSTOMER_CREATED)
  async onCustomerCreated(payload: CustomerCreatedPayload) {
    this.logger.log(`Creating CRM contact for new customer: ${payload.name}`);
    try {
      // Check if customer already has a contact linked
      const [customer] = await this.db
        .select({ contactId: customers.contactId })
        .from(customers)
        .where(eq(customers.id, payload.customerId))
        .limit(1);

      if (customer?.contactId) {
        this.logger.debug(`Customer ${payload.customerId} already has contact ${customer.contactId}`);
        return;
      }

      // Split name into first/last
      const nameParts = payload.name.trim().split(/\s+/);
      const firstName = nameParts[0] || payload.name;
      const lastName = nameParts.slice(1).join(' ') || '-';

      const [contact] = await this.db
        .insert(contacts)
        .values({
          tenantId: payload.tenantId,
          type: 'customer',
          firstName,
          lastName,
          email: payload.email,
          phone: payload.phone,
          mobile: payload.mobile,
          company: payload.company || payload.name,
          status: 'active',
          notes: `Auto-created from customer: ${payload.name}`,
        })
        .returning();

      // Link contact back to customer
      await this.db
        .update(customers)
        .set({ contactId: contact.id, updatedAt: new Date() })
        .where(eq(customers.id, payload.customerId));

      this.logger.log(`CRM contact ${contact.id} created and linked to customer ${payload.customerId}`);
    } catch (err) {
      this.logger.error(`Failed to create CRM contact for customer ${payload.customerId}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUYING → CRM: Supplier Created → Auto-create CRM Contact (vendor)
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.SUPPLIER_CREATED)
  async onSupplierCreated(payload: SupplierCreatedPayload) {
    this.logger.log(`Creating CRM contact for new supplier: ${payload.name}`);
    try {
      // Check if supplier already has a contact linked
      const [supplier] = await this.db
        .select({ contactId: suppliers.contactId })
        .from(suppliers)
        .where(eq(suppliers.id, payload.supplierId))
        .limit(1);

      if (supplier?.contactId) {
        this.logger.debug(`Supplier ${payload.supplierId} already has contact ${supplier.contactId}`);
        return;
      }

      // Use contactPerson if available, otherwise split company name
      let firstName: string;
      let lastName: string;
      if (payload.contactPerson) {
        const parts = payload.contactPerson.trim().split(/\s+/);
        firstName = parts[0] || payload.contactPerson;
        lastName = parts.slice(1).join(' ') || '-';
      } else {
        firstName = payload.name;
        lastName = '-';
      }

      const [contact] = await this.db
        .insert(contacts)
        .values({
          tenantId: payload.tenantId,
          type: 'vendor',
          firstName,
          lastName,
          email: payload.email,
          phone: payload.phone,
          company: payload.company || payload.name,
          status: 'active',
          notes: `Auto-created from supplier: ${payload.name}`,
        })
        .returning();

      // Link contact back to supplier
      await this.db
        .update(suppliers)
        .set({ contactId: contact.id, updatedAt: new Date() })
        .where(eq(suppliers.id, payload.supplierId));

      this.logger.log(`CRM contact ${contact.id} created and linked to supplier ${payload.supplierId}`);
    } catch (err) {
      this.logger.error(`Failed to create CRM contact for supplier ${payload.supplierId}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HR: Leave Approved → Auto-create Attendance Records (on_leave)
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(EVENTS.LEAVE_APPROVED)
  async onLeaveApproved(payload: LeaveApprovedPayload) {
    this.logger.log(`Creating attendance records for approved leave: employee=${payload.employeeId}, ${payload.fromDate} to ${payload.toDate}`);
    try {
      const from = new Date(payload.fromDate);
      const to = new Date(payload.toDate);
      let created = 0;

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        // Check if attendance record already exists for this date
        const [existing] = await this.db
          .select({ id: attendanceRecords.id })
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, payload.employeeId),
              eq(attendanceRecords.tenantId, payload.tenantId),
              eq(attendanceRecords.date, dateStr),
            ),
          )
          .limit(1);

        if (existing) {
          // Update existing record to on_leave
          await this.db
            .update(attendanceRecords)
            .set({
              status: 'on_leave',
              notes: `Leave approved (application: ${payload.applicationId})`,
              updatedAt: new Date(),
            })
            .where(eq(attendanceRecords.id, existing.id));
        } else {
          await this.db.insert(attendanceRecords).values({
            tenantId: payload.tenantId,
            employeeId: payload.employeeId,
            date: dateStr,
            status: 'on_leave',
            notes: `Leave approved (application: ${payload.applicationId})`,
          });
        }
        created++;
      }

      this.logger.log(`Created/updated ${created} attendance records for leave ${payload.applicationId}`);
    } catch (err) {
      this.logger.error(`Failed to create attendance records for leave ${payload.applicationId}: ${err}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW: Completed/Rejected → Update Document Status
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent('APPROVAL_COMPLETED')
  async onApprovalCompleted(payload: { tenantId: string; documentType: string; documentId: string }) {
    this.logger.log(`Approval completed for ${payload.documentType} ${payload.documentId}`);
    try {
      switch (payload.documentType) {
        case 'material_request':
          await this.db.update(materialRequests).set({
            status: 'approved',
            isPendingApproval: false,
            approvedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(eq(materialRequests.id, payload.documentId), eq(materialRequests.tenantId, payload.tenantId)));
          break;
        case 'purchase_order':
          await this.db.update(purchaseOrders).set({
            status: 'approved',
            isPendingApproval: false,
            approvedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(eq(purchaseOrders.id, payload.documentId), eq(purchaseOrders.tenantId, payload.tenantId)));
          break;
        case 'bill':
          await this.db.update(bills).set({
            status: 'approved',
            updatedAt: new Date(),
          }).where(and(eq(bills.id, payload.documentId), eq(bills.tenantId, payload.tenantId)));
          break;
      }
    } catch (err) {
      this.logger.error(`Failed to process approval completion for ${payload.documentType} ${payload.documentId}: ${err}`);
    }
  }

  @OnEvent('APPROVAL_REJECTED')
  async onApprovalRejected(payload: { tenantId: string; documentType: string; documentId: string }) {
    this.logger.log(`Approval rejected for ${payload.documentType} ${payload.documentId}`);
    try {
      switch (payload.documentType) {
        case 'material_request':
          await this.db.update(materialRequests).set({
            status: 'rejected',
            isPendingApproval: false,
            updatedAt: new Date(),
          }).where(and(eq(materialRequests.id, payload.documentId), eq(materialRequests.tenantId, payload.tenantId)));
          break;
        case 'purchase_order':
          await this.db.update(purchaseOrders).set({
            status: 'cancelled',
            isPendingApproval: false,
            updatedAt: new Date(),
          }).where(and(eq(purchaseOrders.id, payload.documentId), eq(purchaseOrders.tenantId, payload.tenantId)));
          break;
        case 'bill':
          await this.db.update(bills).set({
            status: 'draft',
            updatedAt: new Date(),
          }).where(and(eq(bills.id, payload.documentId), eq(bills.tenantId, payload.tenantId)));
          break;
      }
    } catch (err) {
      this.logger.error(`Failed to process approval rejection for ${payload.documentType} ${payload.documentId}: ${err}`);
    }
  }
}
