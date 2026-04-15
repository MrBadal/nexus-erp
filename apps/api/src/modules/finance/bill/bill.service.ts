import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  bills,
  billLines,
  journalEntries,
  journalLines,
  accounts,
  purchaseOrders,
  purchaseOrderLines,
  purchaseReceiptLines,
  purchaseReceipts,
  suppliers,
  tdsDeductions,
  invoices,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';
import { TdsService } from '../tds/tds.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { ACCOUNT_CODES } from '../../../common/account-codes.constants.js';

interface CreateBillDto {
  vendorId: string;
  vendorInvoiceNumber?: string;
  purchaseOrderId?: string;
  issueDate: string;
  dueDate: string;
  paymentTerms?: string;
  currencyCode?: string;
  notes?: string;
  lines: {
    itemId?: string;
    purchaseOrderLineId?: string;
    description?: string;
    quantity: string;
    unitPrice: string;
    discountType?: string;
    discountValue?: string;
    taxAmount?: string;
    accountId?: string;
    hsnCode?: string;
  }[];
}

@Injectable()
export class BillService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
    private readonly tdsService: TdsService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      vendorId?: string;
      purchaseOrderId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(bills.tenantId, tenantId),
      isNull(bills.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(bills.status, options.status as 'draft' | 'received' | 'approved' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'void'),
      );
    }
    if (options?.vendorId) {
      conditions.push(eq(bills.vendorId, options.vendorId));
    }
    if (options?.purchaseOrderId) {
      conditions.push(eq(bills.purchaseOrderId, options.purchaseOrderId));
    }

    return this.db
      .select()
      .from(bills)
      .where(and(...conditions))
      .orderBy(desc(bills.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [bill] = await this.db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.id, id),
          eq(bills.tenantId, tenantId),
          isNull(bills.deletedAt),
        ),
      )
      .limit(1);

    if (!bill) {
      throw new NotFoundException(`Bill with ID "${id}" not found`);
    }

    const lines = await this.db
      .select()
      .from(billLines)
      .where(eq(billLines.billId, id));

    return { ...bill, lines };
  }

  async create(tenantId: string, userId: string, data: CreateBillDto) {
    // Duplicate bill detection
    if (data.vendorId && data.vendorInvoiceNumber) {
      const [existing] = await this.db.select({ id: bills.id, billNumber: bills.billNumber })
        .from(bills)
        .where(and(
          eq(bills.tenantId, tenantId),
          eq(bills.vendorId, data.vendorId),
          sql`LOWER(${bills.vendorInvoiceNumber}) = LOWER(${data.vendorInvoiceNumber})`,
          isNull(bills.deletedAt),
        ));
      if (existing) {
        throw new ConflictException(
          `Duplicate bill: ${existing.billNumber} already exists for vendor invoice "${data.vendorInvoiceNumber}"`
        );
      }
    }

    const billNumber = await this.numberSeriesService.getNext(tenantId, 'bill');

    // Calculate totals from lines
    let subtotal = 0;
    let totalTax = 0;

    const lineData = data.lines.map((line, idx) => {
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      const lineSubtotal = qty * price;

      // Apply discount
      let discountAmt = 0;
      if (line.discountType === 'percentage' && line.discountValue) {
        discountAmt = lineSubtotal * (parseFloat(line.discountValue) / 100);
      } else if (line.discountType === 'fixed' && line.discountValue) {
        discountAmt = parseFloat(line.discountValue);
      }

      const taxableAmount = lineSubtotal - discountAmt;
      const lineTaxAmt = parseFloat(line.taxAmount || '0');
      const lineTotal = taxableAmount + lineTaxAmt;

      subtotal += lineSubtotal - discountAmt;
      totalTax += lineTaxAmt;

      return {
        lineNumber: idx + 1,
        itemId: line.itemId || null,
        purchaseOrderLineId: line.purchaseOrderLineId || null,
        description: line.description || null,
        quantity: qty.toFixed(4),
        unitPrice: price.toFixed(4),
        discountType: line.discountType as 'percentage' | 'fixed' | null || null,
        discountValue: line.discountValue || '0',
        taxAmount: lineTaxAmt.toFixed(4),
        lineTotal: lineTotal.toFixed(4),
        accountId: line.accountId || null,
        hsnCode: line.hsnCode || null,
      };
    });

    const total = subtotal + totalTax;

    // MSME 45-day due date enforcement per MSMED Act
    let effectiveDueDate = data.dueDate;
    if (data.vendorId) {
      const [supplier] = await this.db
        .select()
        .from(suppliers)
        .where(
          and(eq(suppliers.id, data.vendorId), eq(suppliers.tenantId, tenantId)),
        );
      if (supplier?.msmeRegistered) {
        const maxDueDate = new Date(data.issueDate);
        maxDueDate.setDate(maxDueDate.getDate() + 45);
        const requestedDueDate = new Date(data.dueDate);
        if (requestedDueDate > maxDueDate) {
          // Cap at 45 days per MSMED Act
          effectiveDueDate = maxDueDate.toISOString().split('T')[0];
        }
      }
    }

    // Determine three-way match status
    let threeWayMatchStatus: 'pending' | 'not_applicable' = 'not_applicable';
    if (data.purchaseOrderId) {
      threeWayMatchStatus = 'pending';
    }

    const [bill] = await this.db
      .insert(bills)
      .values({
        tenantId,
        billNumber,
        vendorId: data.vendorId,
        vendorInvoiceNumber: data.vendorInvoiceNumber || null,
        purchaseOrderId: data.purchaseOrderId || null,
        issueDate: data.issueDate,
        dueDate: effectiveDueDate,
        paymentTerms: (data.paymentTerms as 'net_30' | 'net_60' | 'due_on_receipt') || 'net_30',
        currencyCode: data.currencyCode || 'INR',
        subtotal: subtotal.toFixed(4),
        taxAmount: totalTax.toFixed(4),
        total: total.toFixed(4),
        amountPaid: '0',
        balanceDue: total.toFixed(4),
        status: 'draft',
        threeWayMatchStatus,
        notes: data.notes || null,
        createdBy: userId,
      })
      .returning();

    // Insert bill lines
    if (lineData.length > 0) {
      await this.db.insert(billLines).values(
        lineData.map((line) => ({
          billId: bill.id,
          ...line,
        })),
      );
    }

    await this.auditService.logAction({
      tenantId,
      userId,
      action: 'create',
      entityType: 'bill',
      entityId: bill.id,
      changes: { after: { billNumber, total: total.toFixed(4) } },
    });

    return this.findById(tenantId, bill.id);
  }

  async approve(tenantId: string, id: string, userId: string) {
    const bill = await this.findById(tenantId, id);

    if (bill.status !== 'draft' && bill.status !== 'received') {
      throw new BadRequestException('Only draft or received bills can be approved');
    }

    // Perform 3-way matching if linked to a PO
    let matchStatus: 'matched' | 'mismatch' | 'partial_match' | 'not_applicable' = 'not_applicable';

    if (bill.purchaseOrderId) {
      matchStatus = await this.performThreeWayMatch(tenantId, bill);
    }

    // B.5: Auto debit note on 3-way mismatch
    if (matchStatus === 'mismatch' && bill.purchaseOrderId) {
      const debitNoteAmount = await this.calculateMismatchAmount(tenantId, bill);
      if (debitNoteAmount > 0) {
        await this.createAutoDebitNote(tenantId, bill, debitNoteAmount, userId);
      }
    }

    // B.2: TDS deduction
    let tdsAmount = 0;
    if (bill.vendorId) {
      const [supplier] = await this.db.select().from(suppliers).where(
        and(eq(suppliers.id, bill.vendorId), eq(suppliers.tenantId, tenantId))
      );
      if (supplier?.tdsApplicable && supplier?.defaultTdsSectionId) {
        const tdsCalc = await this.tdsService.calculateTds(
          tenantId, supplier.id, supplier.defaultTdsSectionId,
          parseFloat(bill.total), supplier.panNumber || undefined
        );
        if (tdsCalc.tdsAmount > 0) {
          tdsAmount = tdsCalc.tdsAmount;
          // Create TDS deduction record
          await this.db.insert(tdsDeductions).values({
            tenantId, billId: bill.id, supplierId: supplier.id,
            tdsSectionId: supplier.defaultTdsSectionId,
            grossAmount: bill.total, tdsRate: String(tdsCalc.tdsRate),
            tdsAmount: String(tdsCalc.tdsAmount), netAmount: String(tdsCalc.netAmount),
            deductionDate: new Date().toISOString().split('T')[0],
            fiscalYear: this.getCurrentFiscalYear(),
          });
          // Update vendor TDS ledger
          await this.tdsService.updateVendorTdsLedger(
            tenantId, supplier.id, this.getCurrentFiscalYear(),
            String(parseFloat(bill.total)), String(tdsCalc.tdsAmount)
          );
          // Update bill with TDS info
          await this.db.update(bills).set({
            tdsSectionId: supplier.defaultTdsSectionId,
            tdsRate: String(tdsCalc.tdsRate),
            tdsAmount: String(tdsCalc.tdsAmount),
          }).where(eq(bills.id, bill.id));
        }
      }
    }

    // Post GL journal: DR Expense/Inventory, CR Accounts Payable (with TDS split)
    const journalEntryId = await this.postBillJournal(tenantId, bill, userId, tdsAmount);

    // B.3: RCM posting
    if (bill.rcmApplicable && parseFloat(bill.taxAmount) > 0) {
      await this.postRcmJournal(tenantId, bill, userId);
    }

    // Update bill status
    await this.db
      .update(bills)
      .set({
        status: 'approved',
        threeWayMatchStatus: matchStatus,
        journalEntryId,
        updatedAt: new Date(),
      })
      .where(eq(bills.id, id));

    await this.auditService.logAction({
      tenantId,
      userId,
      action: 'approve',
      entityType: 'bill',
      entityId: id,
      changes: { status: 'approved', matchStatus, billNumber: bill.billNumber },
    });

    return this.findById(tenantId, id);
  }

  async voidBill(tenantId: string, id: string) {
    const bill = await this.findById(tenantId, id);

    if (bill.status === 'void' || bill.status === 'cancelled') {
      throw new BadRequestException('Bill is already void or cancelled');
    }

    if (parseFloat(bill.amountPaid) > 0) {
      throw new BadRequestException('Cannot void a bill with payments. Reverse payments first.');
    }

    // Reverse the GL journal if exists
    if (bill.journalEntryId) {
      await this.db
        .update(journalEntries)
        .set({ status: 'reversed', updatedAt: new Date() })
        .where(eq(journalEntries.id, bill.journalEntryId));
    }

    await this.db
      .update(bills)
      .set({ status: 'void', updatedAt: new Date() })
      .where(eq(bills.id, id));

    await this.auditService.logAction({
      tenantId,
      action: 'void',
      entityType: 'bill',
      entityId: id,
      changes: { status: 'void', billNumber: bill.billNumber },
    });

    return this.findById(tenantId, id);
  }

  /**
   * Performs 3-way matching: PO qty vs GRN accepted qty vs bill qty
   */
  private async performThreeWayMatch(
    tenantId: string,
    bill: { purchaseOrderId: string | null; lines: { purchaseOrderLineId: string | null; quantity: string }[] },
  ): Promise<'matched' | 'mismatch' | 'partial_match'> {
    if (!bill.purchaseOrderId) return 'matched';

    // Get PO lines
    const poLines = await this.db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, bill.purchaseOrderId));

    // Get all GRN lines for this PO
    const receipts = await this.db
      .select({ id: purchaseReceipts.id })
      .from(purchaseReceipts)
      .where(
        and(
          eq(purchaseReceipts.purchaseOrderId, bill.purchaseOrderId),
          eq(purchaseReceipts.tenantId, tenantId),
          eq(purchaseReceipts.status, 'completed'),
        ),
      );

    const receiptIds = receipts.map((r) => r.id);

    let allMatched = true;
    let anyMatched = false;

    for (const billLine of bill.lines) {
      if (!billLine.purchaseOrderLineId) continue;

      const poLine = poLines.find((pl) => pl.id === billLine.purchaseOrderLineId);
      if (!poLine) {
        allMatched = false;
        continue;
      }

      const poQty = parseFloat(poLine.quantity);
      const billQty = parseFloat(billLine.quantity);

      // Sum accepted qty from GRN lines for this PO line
      let receivedQty = 0;
      if (receiptIds.length > 0) {
        for (const receiptId of receiptIds) {
          const grnLines = await this.db
            .select()
            .from(purchaseReceiptLines)
            .where(
              and(
                eq(purchaseReceiptLines.purchaseReceiptId, receiptId),
                eq(purchaseReceiptLines.purchaseOrderLineId, billLine.purchaseOrderLineId),
              ),
            );
          for (const gl of grnLines) {
            receivedQty += parseFloat(gl.acceptedQty);
          }
        }
      }

      // Check: PO qty, received qty, and bill qty should all match
      const qtyMatch = Math.abs(poQty - billQty) < 0.01 && Math.abs(receivedQty - billQty) < 0.01;

      if (qtyMatch) {
        anyMatched = true;
      } else {
        allMatched = false;
      }
    }

    if (allMatched && anyMatched) return 'matched';
    if (anyMatched) return 'partial_match';
    return 'mismatch';
  }

  /**
   * Posts GL journal for approved bill:
   * DR Expense or Inventory account (from bill lines)
   * CR Accounts Payable (net of TDS if applicable)
   * CR TDS Payable (if TDS deducted)
   */
  private async postBillJournal(
    tenantId: string,
    bill: {
      id: string;
      billNumber: string;
      total: string;
      issueDate: string;
      lines: { accountId: string | null; lineTotal: string; taxAmount: string; itcEligible: boolean }[];
    },
    userId: string,
    tdsAmount: number = 0,
  ): Promise<string> {
    const amount = parseFloat(bill.total);

    // Find Accounts Payable account
    const [apAccount] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, ACCOUNT_CODES.AP)))
      .limit(1);

    // Find default expense account
    const [expenseAccount] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.accountType, 'expense')))
      .limit(1);

    const entryNumber = await this.numberSeriesService.getNext(tenantId, 'journal_entry');

    const [entry] = await this.db
      .insert(journalEntries)
      .values({
        tenantId,
        entryNumber,
        date: bill.issueDate,
        postedDate: bill.issueDate,
        reference: `Bill ${bill.billNumber}`,
        description: `Bill approved - ${bill.billNumber}`,
        sourceType: 'bill',
        status: 'posted',
        totalDebit: amount.toFixed(4),
        totalCredit: amount.toFixed(4),
        createdBy: userId,
      })
      .returning();

    // Debit: Expense/Inventory for each line (or consolidated)
    const debitAccountId = bill.lines[0]?.accountId || expenseAccount?.id || entry.tenantId;

    const journalLineValues: {
      tenantId: string;
      journalEntryId: string;
      lineNumber: number;
      accountId: string;
      description: string;
      debitAmount: string;
      creditAmount: string;
    }[] = [];

    // Line 1: DR Expense (gross amount)
    journalLineValues.push({
      tenantId,
      journalEntryId: entry.id,
      lineNumber: 1,
      accountId: debitAccountId,
      description: `Bill ${bill.billNumber} - Expense`,
      debitAmount: amount.toFixed(4),
      creditAmount: '0',
    });

    if (tdsAmount > 0) {
      // TDS split: CR TDS Payable + CR AP (net)
      const [tdsPayableAccount] = await this.db
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.tenantId, tenantId),
          sql`${accounts.code} = ${ACCOUNT_CODES.TDS_PAYABLE}
              OR LOWER(${accounts.name}) LIKE '%tds%payable%'`,
        ))
        .limit(1);

      const apCreditAmount = amount - tdsAmount;

      // Line 2: CR Accounts Payable (net of TDS)
      journalLineValues.push({
        tenantId,
        journalEntryId: entry.id,
        lineNumber: 2,
        accountId: apAccount?.id || entry.tenantId,
        description: `Bill ${bill.billNumber} - Accounts Payable (net of TDS)`,
        debitAmount: '0',
        creditAmount: apCreditAmount.toFixed(4),
      });

      // Line 3: CR TDS Payable
      journalLineValues.push({
        tenantId,
        journalEntryId: entry.id,
        lineNumber: 3,
        accountId: tdsPayableAccount?.id || apAccount?.id || entry.tenantId,
        description: `Bill ${bill.billNumber} - TDS Payable`,
        debitAmount: '0',
        creditAmount: tdsAmount.toFixed(4),
      });
    } else {
      // No TDS: CR AP for full amount
      journalLineValues.push({
        tenantId,
        journalEntryId: entry.id,
        lineNumber: 2,
        accountId: apAccount?.id || entry.tenantId,
        description: `Bill ${bill.billNumber} - Accounts Payable`,
        debitAmount: '0',
        creditAmount: amount.toFixed(4),
      });
    }

    await this.db.insert(journalLines).values(journalLineValues);

    // B.4: ITC split for tax amounts
    const eligibleTax = bill.lines
      .filter(l => l.itcEligible !== false)
      .reduce((sum, l) => sum + parseFloat(l.taxAmount || '0'), 0);
    const blockedTax = bill.lines
      .filter(l => l.itcEligible === false)
      .reduce((sum, l) => sum + parseFloat(l.taxAmount || '0'), 0);

    // If there's blocked ITC, add additional journal lines
    if (blockedTax > 0) {
      // Find GST Expense account for blocked ITC
      const [gstExpenseAccount] = await this.db
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.tenantId, tenantId),
          sql`${accounts.code} = ${ACCOUNT_CODES.BLOCKED_ITC_EXPENSE}
              OR LOWER(${accounts.name}) LIKE '%gst%expense%'
              OR LOWER(${accounts.name}) LIKE '%blocked%itc%'`,
        ))
        .limit(1);

      if (gstExpenseAccount) {
        const currentLineCount = journalLineValues.length;
        // DR Blocked ITC Expense
        await this.db.insert(journalLines).values({
          tenantId,
          journalEntryId: entry.id,
          lineNumber: currentLineCount + 1,
          accountId: gstExpenseAccount.id,
          description: `Blocked ITC - Bill ${bill.billNumber}`,
          debitAmount: blockedTax.toFixed(4),
          creditAmount: '0',
        });
      }
    }

    return entry.id;
  }

  /**
   * B.3: Posts RCM (Reverse Charge Mechanism) journal entry
   * DR Input GST (claimable credit), CR RCM Liability
   */
  private async postRcmJournal(
    tenantId: string,
    bill: { id: string; billNumber: string; taxAmount: string; issueDate: string },
    userId: string,
  ): Promise<void> {
    const taxAmount = parseFloat(bill.taxAmount);

    // Find Input GST account by canonical code, with name-pattern fallback
    const [inputGstAccount] = await this.db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.tenantId, tenantId),
        sql`${accounts.code} = ${ACCOUNT_CODES.INPUT_GST}
            OR LOWER(${accounts.name}) LIKE '%input%gst%'
            OR LOWER(${accounts.name}) LIKE '%input%tax%credit%'`,
      ))
      .limit(1);

    // Find RCM Liability account by canonical code, with name-pattern fallback
    const [rcmAccount] = await this.db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.tenantId, tenantId),
        sql`${accounts.code} = ${ACCOUNT_CODES.RCM_LIABILITY}
            OR LOWER(${accounts.name}) LIKE '%rcm%'
            OR LOWER(${accounts.name}) LIKE '%reverse%charge%'`,
      ))
      .limit(1);

    if (!inputGstAccount || !rcmAccount) return;

    const entryNumber = await this.numberSeriesService.getNext(tenantId, 'journal_entry');

    const [entry] = await this.db
      .insert(journalEntries)
      .values({
        tenantId,
        entryNumber,
        date: bill.issueDate,
        postedDate: bill.issueDate,
        reference: `RCM - Bill ${bill.billNumber}`,
        description: `Reverse Charge Mechanism entry for Bill ${bill.billNumber}`,
        sourceType: 'bill',
        sourceId: bill.id,
        status: 'posted',
        totalDebit: taxAmount.toFixed(4),
        totalCredit: taxAmount.toFixed(4),
        createdBy: userId,
      })
      .returning();

    await this.db.insert(journalLines).values([
      {
        tenantId,
        journalEntryId: entry.id,
        lineNumber: 1,
        accountId: inputGstAccount.id,
        description: `RCM Input GST - Bill ${bill.billNumber}`,
        debitAmount: taxAmount.toFixed(4),
        creditAmount: '0',
      },
      {
        tenantId,
        journalEntryId: entry.id,
        lineNumber: 2,
        accountId: rcmAccount.id,
        description: `RCM Liability - Bill ${bill.billNumber}`,
        debitAmount: '0',
        creditAmount: taxAmount.toFixed(4),
      },
    ]);
  }

  /**
   * B.5: Calculate mismatch amount between bill qty and received qty
   */
  private async calculateMismatchAmount(
    tenantId: string,
    bill: { purchaseOrderId: string | null; lines: { purchaseOrderLineId: string | null; quantity: string; unitPrice: string }[] },
  ): Promise<number> {
    if (!bill.purchaseOrderId) return 0;

    let mismatchTotal = 0;

    const receipts = await this.db
      .select({ id: purchaseReceipts.id })
      .from(purchaseReceipts)
      .where(
        and(
          eq(purchaseReceipts.purchaseOrderId, bill.purchaseOrderId),
          eq(purchaseReceipts.tenantId, tenantId),
          eq(purchaseReceipts.status, 'completed'),
        ),
      );

    for (const billLine of bill.lines) {
      if (!billLine.purchaseOrderLineId) continue;

      let receivedQty = 0;
      for (const receipt of receipts) {
        const grnLines = await this.db
          .select()
          .from(purchaseReceiptLines)
          .where(
            and(
              eq(purchaseReceiptLines.purchaseReceiptId, receipt.id),
              eq(purchaseReceiptLines.purchaseOrderLineId, billLine.purchaseOrderLineId),
            ),
          );
        for (const gl of grnLines) {
          receivedQty += parseFloat(gl.acceptedQty);
        }
      }

      const billQty = parseFloat(billLine.quantity);
      if (billQty > receivedQty) {
        mismatchTotal += (billQty - receivedQty) * parseFloat(billLine.unitPrice);
      }
    }

    return mismatchTotal;
  }

  /**
   * B.5: Create auto debit note for quantity mismatch
   */
  private async createAutoDebitNote(
    tenantId: string,
    bill: { id: string; billNumber: string; vendorId: string | null; issueDate: string },
    amount: number,
    userId: string,
  ): Promise<void> {
    if (!bill.vendorId) return;

    const invoiceNumber = await this.numberSeriesService.getNext(tenantId, 'debit_note');

    await this.db.insert(invoices).values({
      tenantId,
      invoiceNumber,
      type: 'debit_note',
      status: 'draft',
      customerId: bill.vendorId, // Vendor becomes the "customer" for debit note
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      subtotal: amount.toFixed(4),
      taxAmount: '0',
      total: amount.toFixed(4),
      amountPaid: '0',
      balanceDue: amount.toFixed(4),
      notes: `Auto-generated debit note for quantity mismatch on Bill ${bill.billNumber}`,
      createdBy: userId,
    });
  }

  private getCurrentFiscalYear(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }
}
