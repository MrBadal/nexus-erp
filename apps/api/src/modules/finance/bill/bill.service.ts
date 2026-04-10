import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
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
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';

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

    // Post GL journal: DR Expense/Inventory, CR Accounts Payable
    const journalEntryId = await this.postBillJournal(tenantId, bill, userId);

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
   * CR Accounts Payable
   */
  private async postBillJournal(
    tenantId: string,
    bill: { id: string; billNumber: string; total: string; issueDate: string; lines: { accountId: string | null; lineTotal: string }[] },
    userId: string,
  ): Promise<string> {
    const amount = parseFloat(bill.total);

    // Find Accounts Payable account
    const [apAccount] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, '2100')))
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

    await this.db.insert(journalLines).values([
      {
        tenantId,
        journalEntryId: entry.id,
        lineNumber: 1,
        accountId: debitAccountId,
        description: `Bill ${bill.billNumber} - Expense`,
        debitAmount: amount.toFixed(4),
        creditAmount: '0',
      },
      {
        tenantId,
        journalEntryId: entry.id,
        lineNumber: 2,
        accountId: apAccount?.id || entry.tenantId,
        description: `Bill ${bill.billNumber} - Accounts Payable`,
        debitAmount: '0',
        creditAmount: amount.toFixed(4),
      },
    ]);

    return entry.id;
  }
}
