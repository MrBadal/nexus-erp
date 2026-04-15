import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  raBills,
  raBillLines,
  constructionContracts,
  boqItems,
  accounts,
  journalEntries,
  journalLines,
  invoices,
  invoiceLines,
  type NewRaBill,
  type NewRaBillLine,
} from '../../../database/schema/index.js';
import { EVENTS } from '../../../common/events.constants.js';

interface CreateRaBillDto {
  contractId: string;
  billDate: string;
  measurementPeriodFrom?: string;
  measurementPeriodTo?: string;
  notes?: string;
  lines: {
    boqItemId: string;
    description?: string;
    unit: string;
    totalQuantity: string;     // Cumulative to date
    previousQuantity?: string;
    rate: string;
  }[];
}

@Injectable()
export class RaBillService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: { contractId?: string; status?: string; limit?: number; offset?: number },
  ) {
    const conditions = [eq(raBills.tenantId, tenantId), isNull(raBills.deletedAt)];

    if (options?.contractId) conditions.push(eq(raBills.contractId, options.contractId));
    if (options?.status) conditions.push(eq(raBills.status, options.status as any));

    return this.db
      .select()
      .from(raBills)
      .where(and(...conditions))
      .orderBy(desc(raBills.billDate))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [bill] = await this.db
      .select()
      .from(raBills)
      .where(and(eq(raBills.id, id), eq(raBills.tenantId, tenantId), isNull(raBills.deletedAt)))
      .limit(1);

    if (!bill) throw new NotFoundException(`RA Bill with ID "${id}" not found`);

    const lines = await this.db
      .select()
      .from(raBillLines)
      .where(eq(raBillLines.raBillId, id));

    return { ...bill, lines };
  }

  async create(tenantId: string, userId: string, data: CreateRaBillDto) {
    const [contract] = await this.db
      .select()
      .from(constructionContracts)
      .where(
        and(
          eq(constructionContracts.id, data.contractId),
          eq(constructionContracts.tenantId, tenantId),
          isNull(constructionContracts.deletedAt),
        ),
      )
      .limit(1);

    if (!contract) throw new BadRequestException('Contract not found');
    if (!['active', 'awarded'].includes(contract.status)) {
      throw new BadRequestException('Contract must be active or awarded to create RA Bills');
    }
    if (!data.lines || data.lines.length === 0) {
      throw new BadRequestException('At least one BOQ line is required to create an RA Bill');
    }

    // Get previous bill sequence
    const prevBills = await this.db
      .select({ billSequence: raBills.billSequence })
      .from(raBills)
      .where(and(eq(raBills.contractId, data.contractId), isNull(raBills.deletedAt)))
      .orderBy(desc(raBills.billSequence))
      .limit(1);

    const billSequence = prevBills.length > 0 ? prevBills[0].billSequence + 1 : 1;
    const billNumber = `RA-${contract.contractNumber}-${billSequence.toString().padStart(2, '0')}`;

    // Calculate amounts
    let currentBillAmount = 0;
    let previousBilledAmount = 0;

    const calculatedLines = data.lines.map((line) => {
      const totalQty = parseFloat(line.totalQuantity);
      const prevQty = parseFloat(line.previousQuantity || '0');
      const currentQty = totalQty - prevQty;
      const rate = parseFloat(line.rate);
      const amount = currentQty * rate;
      currentBillAmount += amount;

      return {
        ...line,
        currentQuantity: currentQty.toFixed(4),
        amount: amount.toFixed(2),
      };
    });

    const gstRate = parseFloat(contract.gstRate);
    const retentionPct = parseFloat(contract.retentionPercentage);
    const gstAmount = currentBillAmount * (gstRate / 100);
    const retentionAmount = currentBillAmount * (retentionPct / 100);

    // Mobilisation advance recovery
    const mobilisationAdvance = parseFloat(contract.mobilisationAdvance || '0');
    const advanceRecoveryPct = parseFloat(
      (contract as any).advanceRecoveryPercent || '10.00',
    );
    const priorAdjustmentsRow = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${raBills.advanceAdjusted} AS numeric)), 0)`,
      })
      .from(raBills)
      .where(and(eq(raBills.contractId, data.contractId), isNull(raBills.deletedAt)));
    const sumPriorAdjustments = parseFloat(priorAdjustmentsRow[0]?.total || '0');
    const remainingAdvance = Math.max(0, mobilisationAdvance - sumPriorAdjustments);
    const proposedRecovery = currentBillAmount * (advanceRecoveryPct / 100);
    const advanceAdjusted = Math.min(proposedRecovery, remainingAdvance);

    const netPayable =
      currentBillAmount + gstAmount - retentionAmount - advanceAdjusted;

    const [bill] = await this.db
      .insert(raBills)
      .values({
        tenantId,
        contractId: data.contractId,
        billNumber,
        billDate: data.billDate,
        status: 'draft',
        billSequence,
        grossAmount: currentBillAmount.toFixed(2),
        previousBilledAmount: previousBilledAmount.toFixed(2),
        currentBillAmount: currentBillAmount.toFixed(2),
        retentionAmount: retentionAmount.toFixed(2),
        mobilisationRecovery: '0',
        advanceAdjusted: advanceAdjusted.toFixed(4),
        otherDeductions: '0',
        gstAmount: gstAmount.toFixed(2),
        gstRate: contract.gstRate,
        netPayable: netPayable.toFixed(2),
        measurementPeriodFrom: data.measurementPeriodFrom || null,
        measurementPeriodTo: data.measurementPeriodTo || null,
        notes: data.notes || null,
        createdBy: userId,
      })
      .returning();

    if (calculatedLines.length > 0) {
      await this.db.insert(raBillLines).values(
        calculatedLines.map((l) => ({
          raBillId: bill.id,
          boqItemId: l.boqItemId,
          description: l.description || null,
          unit: l.unit,
          totalQuantity: l.totalQuantity,
          previousQuantity: l.previousQuantity || '0',
          currentQuantity: l.currentQuantity,
          rate: l.rate,
          amount: l.amount,
        })),
      );
    }

    return this.findById(tenantId, bill.id);
  }

  // ── Certify RA Bill → triggers AR Invoice + Finance GL ───────────────────

  async certify(tenantId: string, id: string, userId: string, certifiedBy: string) {
    const bill = await this.findById(tenantId, id);

    if (!['submitted', 'under_review'].includes(bill.status)) {
      throw new BadRequestException(`Cannot certify RA Bill with status "${bill.status}"`);
    }

    const [contract] = await this.db
      .select()
      .from(constructionContracts)
      .where(eq(constructionContracts.id, bill.contractId))
      .limit(1);

    // Update status to certified
    const [updated] = await this.db
      .update(raBills)
      .set({
        status: 'certified',
        certifiedBy,
        certifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(raBills.id, id))
      .returning();

    // Update contract total_billed
    const newTotalBilled = (
      parseFloat(contract.totalBilled) + parseFloat(bill.currentBillAmount)
    ).toFixed(2);
    await this.db
      .update(constructionContracts)
      .set({ totalBilled: newTotalBilled, retentionHeld: sql`retention_held + ${bill.retentionAmount}`, updatedAt: new Date() })
      .where(eq(constructionContracts.id, bill.contractId));

    // Update BOQ item quantities executed
    for (const line of bill.lines) {
      const boqItem = await this.db
        .select()
        .from(boqItems)
        .where(eq(boqItems.id, line.boqItemId))
        .limit(1)
        .then((r) => r[0]);

      if (boqItem) {
        const newQtyExec = (
          parseFloat(boqItem.quantityExecuted) + parseFloat(line.currentQuantity)
        ).toFixed(4);
        const newAmtBilled = (
          parseFloat(boqItem.amountBilled) + parseFloat(line.amount)
        ).toFixed(2);
        await this.db
          .update(boqItems)
          .set({ quantityExecuted: newQtyExec, amountBilled: newAmtBilled, updatedAt: new Date() })
          .where(eq(boqItems.id, line.boqItemId));
      }
    }

    // Emit event → IntegrationService posts AR journal + creates AR invoice
    this.eventEmitter.emit(EVENTS.RA_BILL_CERTIFIED, {
      billId: id,
      tenantId,
      billNumber: bill.billNumber,
      contractId: bill.contractId,
      contractName: contract.name,
      clientName: contract.clientName,
      billDate: bill.billDate,
      currentBillAmount: bill.currentBillAmount,
      gstAmount: bill.gstAmount,
      retentionAmount: bill.retentionAmount,
      netPayable: bill.netPayable,
      userId,
    });

    return this.findById(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findById(tenantId, id);
    const [updated] = await this.db
      .update(raBills)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(raBills.id, id), eq(raBills.tenantId, tenantId)))
      .returning();
    return updated;
  }
}
