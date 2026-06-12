import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  payments,
  paymentAllocations,
  invoices,
  bills,
  journalEntries,
  journalLines,
  accounts,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';
import { EVENTS } from '../../../common/events.constants.js';
import { AuditService } from '../../audit/audit.service.js';

interface CreatePaymentDto {
  date: string;
  amount: string;
  currencyCode?: string;
  paymentMethod: string;
  reference?: string;
  bankAccountId?: string;
  customerId?: string;
  vendorId?: string;
  type: 'received' | 'made';
  notes?: string;
  allocations?: {
    documentType: 'invoice' | 'bill' | 'credit_note' | 'debit_note';
    documentId: string;
    amount: string;
  }[];
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
    private readonly numberSeriesService: NumberSeriesService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    options?: { type?: string; status?: string; customerId?: string; vendorId?: string; limit?: number; offset?: number },
  ) {
    const conditions = [eq(payments.tenantId, tenantId)];

    if (options?.type) {
      conditions.push(eq(payments.type, options.type as 'received' | 'made'));
    }
    if (options?.status) {
      conditions.push(eq(payments.status, options.status as 'draft' | 'confirmed' | 'void'));
    }
    if (options?.customerId) {
      conditions.push(eq(payments.customerId, options.customerId));
    }
    if (options?.vendorId) {
      conditions.push(eq(payments.vendorId, options.vendorId));
    }

    return this.db
      .select()
      .from(payments)
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.tenantId, tenantId)))
      .limit(1);

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }

    const allocations = await this.db
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, id));

    return { ...payment, allocations };
  }

  async create(tenantId: string, userId: string, data: CreatePaymentDto) {
    const paymentNumber = await this.numberSeriesService.getNext(tenantId, 'payment');
    const amount = parseFloat(data.amount);

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const [payment] = await this.db
      .insert(payments)
      .values({
        tenantId,
        paymentNumber,
        date: data.date,
        amount: data.amount,
        currencyCode: data.currencyCode || 'INR',
        paymentMethod: data.paymentMethod as 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'debit_card' | 'online' | 'mobile_money' | 'other',
        reference: data.reference || null,
        bankAccountId: data.bankAccountId || null,
        customerId: data.customerId || null,
        vendorId: data.vendorId || null,
        type: data.type,
        status: 'draft',
        notes: data.notes || null,
        createdBy: userId,
      })
      .returning();

    await this.auditService.logAction({
      tenantId,
      userId,
      action: 'create',
      entityType: 'payment',
      entityId: payment.id,
      changes: { after: { paymentNumber, amount: data.amount, type: data.type } },
    });

    return this.findById(tenantId, payment.id);
  }

  async confirm(tenantId: string, id: string, userId: string) {
    const payment = await this.findById(tenantId, id);

    if (payment.status !== 'draft') {
      throw new BadRequestException('Only draft payments can be confirmed');
    }

    // Create payment allocations if provided
    if (payment.allocations && payment.allocations.length > 0) {
      // Allocations already created at creation time — just validate
      const totalAllocated = payment.allocations.reduce(
        (sum, a) => sum + parseFloat(a.amount),
        0,
      );
      if (totalAllocated > parseFloat(payment.amount) + 0.01) {
        throw new BadRequestException('Total allocations exceed payment amount');
      }
    }

    // Update invoice/bill balances for each allocation
    for (const allocation of payment.allocations) {
      const allocationAmount = parseFloat(allocation.amount);

      if (allocation.documentType === 'invoice') {
        const [invoice] = await this.db
          .select()
          .from(invoices)
          .where(and(eq(invoices.id, allocation.documentId), eq(invoices.tenantId, tenantId)))
          .limit(1);

        if (invoice) {
          const newPaid = parseFloat(invoice.amountPaid) + allocationAmount;
          const newBalance = parseFloat(invoice.total) - newPaid;
          const newStatus = Math.abs(newBalance) < 0.01 ? 'paid' : 'partially_paid';

          await this.db
            .update(invoices)
            .set({
              amountPaid: newPaid.toFixed(4),
              balanceDue: newBalance.toFixed(4),
              status: newStatus as 'paid' | 'partially_paid',
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, allocation.documentId));
        }
      } else if (allocation.documentType === 'bill') {
        const [bill] = await this.db
          .select()
          .from(bills)
          .where(and(eq(bills.id, allocation.documentId), eq(bills.tenantId, tenantId)))
          .limit(1);

        if (bill) {
          const newPaid = parseFloat(bill.amountPaid) + allocationAmount;
          const newBalance = parseFloat(bill.total) - newPaid;
          const newStatus = Math.abs(newBalance) < 0.01 ? 'paid' : 'partially_paid';

          await this.db
            .update(bills)
            .set({
              amountPaid: newPaid.toFixed(4),
              balanceDue: newBalance.toFixed(4),
              status: newStatus as 'paid' | 'partially_paid',
              updatedAt: new Date(),
            })
            .where(eq(bills.id, allocation.documentId));
        }
      }
    }

    // Post GL journal entry
    const journalEntryId = await this.postPaymentJournal(tenantId, payment, userId);

    // Mark payment as confirmed
    await this.db
      .update(payments)
      .set({
        status: 'confirmed',
        journalEntryId,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id));

    await this.auditService.logAction({
      tenantId,
      userId,
      action: 'approve',
      entityType: 'payment',
      entityId: id,
      changes: { status: 'confirmed', paymentNumber: payment.paymentNumber },
    });

    return this.findById(tenantId, id);
  }

  async voidPayment(tenantId: string, id: string) {
    const payment = await this.findById(tenantId, id);

    if (payment.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed payments can be voided');
    }

    // Reverse invoice/bill balances
    for (const allocation of payment.allocations) {
      const allocationAmount = parseFloat(allocation.amount);

      if (allocation.documentType === 'invoice') {
        const [invoice] = await this.db
          .select()
          .from(invoices)
          .where(eq(invoices.id, allocation.documentId))
          .limit(1);

        if (invoice) {
          const newPaid = Math.max(0, parseFloat(invoice.amountPaid) - allocationAmount);
          const newBalance = parseFloat(invoice.total) - newPaid;

          await this.db
            .update(invoices)
            .set({
              amountPaid: newPaid.toFixed(4),
              balanceDue: newBalance.toFixed(4),
              status: newPaid > 0 ? 'partially_paid' : 'sent',
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, allocation.documentId));
        }
      } else if (allocation.documentType === 'bill') {
        const [bill] = await this.db
          .select()
          .from(bills)
          .where(eq(bills.id, allocation.documentId))
          .limit(1);

        if (bill) {
          const newPaid = Math.max(0, parseFloat(bill.amountPaid) - allocationAmount);
          const newBalance = parseFloat(bill.total) - newPaid;

          await this.db
            .update(bills)
            .set({
              amountPaid: newPaid.toFixed(4),
              balanceDue: newBalance.toFixed(4),
              status: newPaid > 0 ? 'partially_paid' : 'approved',
              updatedAt: new Date(),
            })
            .where(eq(bills.id, allocation.documentId));
        }
      }
    }

    // Reverse the GL journal
    if (payment.journalEntryId) {
      await this.db
        .update(journalEntries)
        .set({ status: 'reversed', updatedAt: new Date() })
        .where(eq(journalEntries.id, payment.journalEntryId));
    }

    await this.db
      .update(payments)
      .set({ status: 'void', updatedAt: new Date() })
      .where(eq(payments.id, id));

    await this.auditService.logAction({
      tenantId,
      action: 'void',
      entityType: 'payment',
      entityId: id,
      changes: { status: 'void', paymentNumber: payment.paymentNumber },
    });

    return this.findById(tenantId, id);
  }

  async addAllocation(
    tenantId: string,
    paymentId: string,
    userId: string,
    allocation: { documentType: 'invoice' | 'bill' | 'credit_note' | 'debit_note'; documentId: string; amount: string },
  ) {
    const payment = await this.findById(tenantId, paymentId);

    if (payment.status !== 'draft') {
      throw new BadRequestException('Can only add allocations to draft payments');
    }

    const currentAllocated = payment.allocations.reduce(
      (sum, a) => sum + parseFloat(a.amount),
      0,
    );
    const newAmount = parseFloat(allocation.amount);

    if (currentAllocated + newAmount > parseFloat(payment.amount) + 0.01) {
      throw new BadRequestException('Total allocations would exceed payment amount');
    }

    await this.db.insert(paymentAllocations).values({
      tenantId,
      paymentId,
      documentType: allocation.documentType,
      documentId: allocation.documentId,
      amount: allocation.amount,
      createdBy: userId,
    });

    return this.findById(tenantId, paymentId);
  }

  private async postPaymentJournal(
    tenantId: string,
    payment: { id: string; paymentNumber: string; type: string; amount: string; date: string },
    userId: string,
  ): Promise<string> {
    const amount = parseFloat(payment.amount);

    // Find relevant accounts
    const bankAccount = await this.findAccountByCode(tenantId, '1200'); // Bank/Cash
    const arAccount = await this.findAccountByCode(tenantId, '1300');   // Accounts Receivable
    const apAccount = await this.findAccountByCode(tenantId, '2100');   // Accounts Payable

    const entryNumber = await this.numberSeriesService.getNext(tenantId, 'journal_entry');

    const [entry] = await this.db
      .insert(journalEntries)
      .values({
        tenantId,
        entryNumber,
        date: payment.date,
        postedDate: payment.date,
        reference: `Payment ${payment.paymentNumber}`,
        description: payment.type === 'received'
          ? `Payment received - ${payment.paymentNumber}`
          : `Payment made - ${payment.paymentNumber}`,
        sourceType: 'payment',
        status: 'posted',
        totalDebit: amount.toFixed(4),
        totalCredit: amount.toFixed(4),
        createdBy: userId,
      })
      .returning();

    if (payment.type === 'received') {
      // DR Bank/Cash, CR Accounts Receivable
      await this.db.insert(journalLines).values([
        {
          tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: bankAccount?.id ?? entry.tenantId, // fallback; should always have bank account
          description: `Payment received - ${payment.paymentNumber}`,
          debitAmount: amount.toFixed(4),
          creditAmount: '0',
        },
        {
          tenantId,
          journalEntryId: entry.id,
          lineNumber: 2,
          accountId: arAccount?.id ?? entry.tenantId,
          description: `Payment received - ${payment.paymentNumber}`,
          debitAmount: '0',
          creditAmount: amount.toFixed(4),
        },
      ]);
    } else {
      // DR Accounts Payable, CR Bank/Cash
      await this.db.insert(journalLines).values([
        {
          tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: apAccount?.id ?? entry.tenantId,
          description: `Payment made - ${payment.paymentNumber}`,
          debitAmount: amount.toFixed(4),
          creditAmount: '0',
        },
        {
          tenantId,
          journalEntryId: entry.id,
          lineNumber: 2,
          accountId: bankAccount?.id ?? entry.tenantId,
          description: `Payment made - ${payment.paymentNumber}`,
          debitAmount: '0',
          creditAmount: amount.toFixed(4),
        },
      ]);
    }

    return entry.id;
  }

  private async findAccountByCode(tenantId: string, code: string) {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, code)))
      .limit(1);
    return account || null;
  }
}
