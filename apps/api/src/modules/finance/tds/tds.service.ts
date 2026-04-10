import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, desc, asc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  tdsSections,
  tdsDeductions,
  vendorTdsLedger,
} from '../../../database/schema/index.js';

// DTOs
interface CreateTdsSectionDto {
  section: string;
  description: string;
  rateIndividual: string;
  rateCompany: string;
  thresholdLimit?: string;
  thresholdPeriod?: 'annual' | 'per_transaction';
}

interface UpdateTdsSectionDto {
  description?: string;
  rateIndividual?: string;
  rateCompany?: string;
  thresholdLimit?: string;
  thresholdPeriod?: 'annual' | 'per_transaction';
}

@Injectable()
export class TdsService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // --- TDS Sections CRUD ---

  async findAllSections(tenantId: string) {
    return this.db
      .select()
      .from(tdsSections)
      .where(and(eq(tdsSections.tenantId, tenantId), eq(tdsSections.isActive, true)))
      .orderBy(asc(tdsSections.section));
  }

  async findSectionById(tenantId: string, id: string) {
    const [section] = await this.db
      .select()
      .from(tdsSections)
      .where(and(eq(tdsSections.id, id), eq(tdsSections.tenantId, tenantId)));
    if (!section) throw new NotFoundException('TDS section not found');
    return section;
  }

  async createSection(tenantId: string, dto: CreateTdsSectionDto) {
    // Check duplicate section code per tenant
    const [existing] = await this.db
      .select()
      .from(tdsSections)
      .where(and(eq(tdsSections.tenantId, tenantId), eq(tdsSections.section, dto.section)));
    if (existing) {
      throw new ConflictException(`TDS section '${dto.section}' already exists`);
    }
    const [created] = await this.db
      .insert(tdsSections)
      .values({
        tenantId,
        section: dto.section,
        description: dto.description,
        rateIndividual: dto.rateIndividual,
        rateCompany: dto.rateCompany,
        thresholdLimit: dto.thresholdLimit || '0',
        thresholdPeriod: dto.thresholdPeriod || 'annual',
      })
      .returning();
    return created;
  }

  async updateSection(tenantId: string, id: string, dto: UpdateTdsSectionDto) {
    await this.findSectionById(tenantId, id);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.rateIndividual !== undefined) updateData.rateIndividual = dto.rateIndividual;
    if (dto.rateCompany !== undefined) updateData.rateCompany = dto.rateCompany;
    if (dto.thresholdLimit !== undefined) updateData.thresholdLimit = dto.thresholdLimit;
    if (dto.thresholdPeriod !== undefined) updateData.thresholdPeriod = dto.thresholdPeriod;

    const [updated] = await this.db
      .update(tdsSections)
      .set(updateData)
      .where(and(eq(tdsSections.id, id), eq(tdsSections.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deactivateSection(tenantId: string, id: string) {
    await this.findSectionById(tenantId, id);
    const [updated] = await this.db
      .update(tdsSections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(tdsSections.id, id), eq(tdsSections.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async seedDefaultSections(tenantId: string) {
    const defaults = [
      {
        section: '194C',
        description: 'Payment to Contractors',
        rateIndividual: '1',
        rateCompany: '2',
        thresholdLimit: '30000',
        thresholdPeriod: 'annual' as const,
      },
      {
        section: '194J',
        description: 'Professional/Technical Services',
        rateIndividual: '10',
        rateCompany: '10',
        thresholdLimit: '30000',
        thresholdPeriod: 'annual' as const,
      },
      {
        section: '194Q',
        description: 'Purchase of Goods',
        rateIndividual: '0.1',
        rateCompany: '0.1',
        thresholdLimit: '5000000',
        thresholdPeriod: 'annual' as const,
      },
      {
        section: '194H',
        description: 'Commission/Brokerage',
        rateIndividual: '5',
        rateCompany: '5',
        thresholdLimit: '15000',
        thresholdPeriod: 'annual' as const,
      },
      {
        section: '194I(a)',
        description: 'Rent - Land/Building',
        rateIndividual: '10',
        rateCompany: '10',
        thresholdLimit: '240000',
        thresholdPeriod: 'annual' as const,
      },
      {
        section: '194I(b)',
        description: 'Rent - Plant/Machinery',
        rateIndividual: '2',
        rateCompany: '2',
        thresholdLimit: '240000',
        thresholdPeriod: 'annual' as const,
      },
      {
        section: '194A',
        description: 'Interest (other than on securities)',
        rateIndividual: '10',
        rateCompany: '10',
        thresholdLimit: '40000',
        thresholdPeriod: 'annual' as const,
      },
    ];

    const results = [];
    for (const def of defaults) {
      // Skip if already exists
      const [existing] = await this.db
        .select()
        .from(tdsSections)
        .where(
          and(eq(tdsSections.tenantId, tenantId), eq(tdsSections.section, def.section)),
        );
      if (!existing) {
        const [created] = await this.db
          .insert(tdsSections)
          .values({
            tenantId,
            ...def,
          })
          .returning();
        results.push(created);
      } else {
        results.push(existing);
      }
    }
    return results;
  }

  // --- TDS Deductions ---

  async findDeductionsByBill(tenantId: string, billId: string) {
    return this.db
      .select()
      .from(tdsDeductions)
      .where(
        and(eq(tdsDeductions.tenantId, tenantId), eq(tdsDeductions.billId, billId)),
      );
  }

  async findDeductionsByVendor(
    tenantId: string,
    supplierId: string,
    fiscalYear?: string,
  ) {
    const conditions = [
      eq(tdsDeductions.tenantId, tenantId),
      eq(tdsDeductions.supplierId, supplierId),
    ];
    if (fiscalYear) {
      conditions.push(eq(tdsDeductions.fiscalYear, fiscalYear));
    }
    return this.db
      .select()
      .from(tdsDeductions)
      .where(and(...conditions))
      .orderBy(desc(tdsDeductions.deductionDate));
  }

  // --- Vendor TDS Ledger ---

  async getVendorTdsLedger(
    tenantId: string,
    supplierId: string,
    fiscalYear: string,
  ) {
    const [ledger] = await this.db
      .select()
      .from(vendorTdsLedger)
      .where(
        and(
          eq(vendorTdsLedger.tenantId, tenantId),
          eq(vendorTdsLedger.supplierId, supplierId),
          eq(vendorTdsLedger.fiscalYear, fiscalYear),
        ),
      );
    if (ledger) return ledger;

    // Auto-create if not exists
    const [created] = await this.db
      .insert(vendorTdsLedger)
      .values({
        tenantId,
        supplierId,
        fiscalYear,
        cumulativePurchases: '0',
        cumulativeTds: '0',
      })
      .returning();
    return created;
  }

  async updateVendorTdsLedger(
    tenantId: string,
    supplierId: string,
    fiscalYear: string,
    purchaseAmount: string,
    tdsAmount: string,
  ) {
    const ledger = await this.getVendorTdsLedger(tenantId, supplierId, fiscalYear);
    const newCumulativePurchases = (
      parseFloat(ledger.cumulativePurchases) + parseFloat(purchaseAmount)
    ).toFixed(4);
    const newCumulativeTds = (
      parseFloat(ledger.cumulativeTds) + parseFloat(tdsAmount)
    ).toFixed(4);

    const [updated] = await this.db
      .update(vendorTdsLedger)
      .set({
        cumulativePurchases: newCumulativePurchases,
        cumulativeTds: newCumulativeTds,
        updatedAt: new Date(),
      })
      .where(eq(vendorTdsLedger.id, ledger.id))
      .returning();
    return updated;
  }

  // --- TDS Calculation Logic ---

  determineTdsRate(
    section: { rateIndividual: string; rateCompany: string },
    panNumber?: string,
  ): string {
    if (!panNumber) return section.rateIndividual;
    // PAN 4th character determines entity type
    // C = Company, rest = Individual/HUF/Firm etc.
    const entityChar = panNumber.charAt(3).toUpperCase();
    return entityChar === 'C' ? section.rateCompany : section.rateIndividual;
  }

  async checkThreshold(
    tenantId: string,
    supplierId: string,
    section: { thresholdLimit: string; thresholdPeriod: string },
    billAmount: number,
    fiscalYear: string,
  ): Promise<{ exceedsThreshold: boolean; taxableAmount: number }> {
    if (section.thresholdPeriod === 'per_transaction') {
      const threshold = parseFloat(section.thresholdLimit);
      if (threshold <= 0 || billAmount > threshold) {
        return { exceedsThreshold: true, taxableAmount: billAmount };
      }
      return { exceedsThreshold: false, taxableAmount: 0 };
    }

    // Annual threshold
    const threshold = parseFloat(section.thresholdLimit);
    if (threshold <= 0) {
      return { exceedsThreshold: true, taxableAmount: billAmount };
    }

    const ledger = await this.getVendorTdsLedger(tenantId, supplierId, fiscalYear);
    const cumulative = parseFloat(ledger.cumulativePurchases);

    if (cumulative >= threshold) {
      // Already exceeded — full amount is taxable
      return { exceedsThreshold: true, taxableAmount: billAmount };
    }

    if (cumulative + billAmount > threshold) {
      // Crossing threshold with this bill — only amount above threshold is taxable
      return {
        exceedsThreshold: true,
        taxableAmount: cumulative + billAmount - threshold,
      };
    }

    return { exceedsThreshold: false, taxableAmount: 0 };
  }

  async calculateTds(
    tenantId: string,
    supplierId: string,
    tdsSectionId: string,
    billAmount: number,
    panNumber?: string,
    fiscalYear?: string,
  ): Promise<{
    tdsRate: number;
    tdsAmount: number;
    netAmount: number;
    taxableAmount: number;
  }> {
    const section = await this.findSectionById(tenantId, tdsSectionId);

    // Determine fiscal year (April to March in India)
    const fy = fiscalYear || this.getCurrentFiscalYear();

    const rate = parseFloat(this.determineTdsRate(section, panNumber));
    const { exceedsThreshold, taxableAmount } = await this.checkThreshold(
      tenantId,
      supplierId,
      section,
      billAmount,
      fy,
    );

    if (!exceedsThreshold) {
      return { tdsRate: rate, tdsAmount: 0, netAmount: billAmount, taxableAmount: 0 };
    }

    const tdsAmount = parseFloat(((taxableAmount * rate) / 100).toFixed(4));
    const netAmount = parseFloat((billAmount - tdsAmount).toFixed(4));

    return { tdsRate: rate, tdsAmount, netAmount, taxableAmount };
  }

  private getCurrentFiscalYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    // Indian FY: April (month 3) to March (month 2)
    if (month >= 3) {
      return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
  }
}
