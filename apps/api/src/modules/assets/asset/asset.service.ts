import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  assets,
  assetCategories,
  journalEntries,
  journalLines,
  accounts,
} from '../../../database/schema/index.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { UpdateAssetDto } from './dto/update-asset.dto.js';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      categoryId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(assets.tenantId, tenantId),
      isNull(assets.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(assets.status, options.status as 'draft' | 'submitted' | 'in_use' | 'maintenance' | 'disposed' | 'scrapped'),
      );
    }

    if (options?.categoryId) {
      conditions.push(eq(assets.assetCategory, options.categoryId));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(assets.name, searchTerm));
    }

    const result = await this.db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [asset] = await this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.id, id),
          eq(assets.tenantId, tenantId),
          isNull(assets.deletedAt),
        ),
      )
      .limit(1);

    if (!asset) {
      throw new NotFoundException(`Asset with ID "${id}" not found`);
    }

    return asset;
  }

  async create(tenantId: string, data: CreateAssetDto) {
    // Validate category if provided
    if (data.assetCategory) {
      const [category] = await this.db
        .select()
        .from(assetCategories)
        .where(
          and(
            eq(assetCategories.id, data.assetCategory),
            eq(assetCategories.tenantId, tenantId),
            isNull(assetCategories.deletedAt),
          ),
        )
        .limit(1);

      if (!category) {
        throw new BadRequestException('Asset category not found');
      }
    }

    const assetNumber = await this.generateAssetNumber(tenantId);

    const purchaseAmount = data.purchaseAmount || '0';

    const [asset] = await this.db
      .insert(assets)
      .values({
        tenantId,
        assetNumber,
        name: data.name,
        assetCategory: data.assetCategory || null,
        status: 'draft',
        location: data.location || null,
        department: data.department || null,
        custodian: data.custodian || null,
        purchaseDate: data.purchaseDate || null,
        purchaseAmount,
        currentValue: purchaseAmount,
        depreciationMethod: (data.depreciationMethod as 'straight_line' | 'declining_balance' | 'double_declining' | 'units_of_production') || 'straight_line',
        usefulLife: data.usefulLife || 60,
        salvageValue: data.salvageValue || '0',
        warrantyExpiry: data.warrantyExpiry || null,
        serialNumber: data.serialNumber || null,
        description: data.description || null,
      })
      .returning();

    return asset;
  }

  async update(tenantId: string, id: string, data: UpdateAssetDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft assets can be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.assetCategory !== undefined) updateData.assetCategory = data.assetCategory;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.custodian !== undefined) updateData.custodian = data.custodian;
    if (data.purchaseDate !== undefined) updateData.purchaseDate = data.purchaseDate;
    if (data.purchaseAmount !== undefined) updateData.purchaseAmount = data.purchaseAmount;
    if (data.depreciationMethod !== undefined) updateData.depreciationMethod = data.depreciationMethod;
    if (data.usefulLife !== undefined) updateData.usefulLife = data.usefulLife;
    if (data.salvageValue !== undefined) updateData.salvageValue = data.salvageValue;
    if (data.warrantyExpiry !== undefined) updateData.warrantyExpiry = data.warrantyExpiry;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.description !== undefined) updateData.description = data.description;

    const [updated] = await this.db
      .update(assets)
      .set(updateData)
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'submitted' | 'in_use' | 'maintenance' | 'disposed' | 'scrapped',
  ) {
    const asset = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['submitted'],
      submitted: ['in_use', 'scrapped'],
      in_use: ['maintenance', 'disposed', 'scrapped'],
      maintenance: ['in_use', 'disposed', 'scrapped'],
    };

    const allowed = validTransitions[asset.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${asset.status}" to "${newStatus}"`,
      );
    }

    const [updated] = await this.db
      .update(assets)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async calculateDepreciation(tenantId: string, id: string) {
    const asset = await this.findById(tenantId, id);

    if (asset.status !== 'in_use') {
      throw new BadRequestException('Only in-use assets can be depreciated');
    }

    const purchaseAmount = parseFloat(asset.purchaseAmount);
    const salvageValue = parseFloat(asset.salvageValue);
    const currentValue = parseFloat(asset.currentValue);
    const usefulLifeMonths = asset.usefulLife;

    let depreciationAmount = 0;

    switch (asset.depreciationMethod) {
      case 'straight_line':
        depreciationAmount = (purchaseAmount - salvageValue) / usefulLifeMonths;
        break;
      case 'declining_balance':
        const rate = 1 / usefulLifeMonths;
        depreciationAmount = currentValue * rate;
        break;
      case 'double_declining':
        const doubleRate = 2 / usefulLifeMonths;
        depreciationAmount = currentValue * doubleRate;
        break;
      case 'units_of_production':
        depreciationAmount = (purchaseAmount - salvageValue) / usefulLifeMonths;
        break;
    }

    const newValue = Math.max(currentValue - depreciationAmount, salvageValue);

    const [updated] = await this.db
      .update(assets)
      .set({
        currentValue: newValue.toFixed(4),
        lastDepreciationDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning();

    // Post depreciation GL journal: DR Depreciation Expense (6050) / CR Accumulated Depreciation (1600)
    if (depreciationAmount > 0) {
      await this.postDepreciationJournal(tenantId, asset, depreciationAmount);
    }

    return {
      ...updated,
      depreciationAmount: depreciationAmount.toFixed(4),
    };
  }

  /**
   * Post GL journal for asset depreciation.
   * DR Depreciation Expense (6050) / CR Accumulated Depreciation (1600)
   */
  private async postDepreciationJournal(
    tenantId: string,
    asset: { id: string; name: string },
    amount: number,
  ) {
    try {
      const [depExpenseAcct] = await this.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, '6050')))
        .limit(1);

      const [accumDepAcct] = await this.db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, '1600')))
        .limit(1);

      if (!depExpenseAcct || !accumDepAcct) {
        this.logger.warn(`Depreciation GL skipped: missing accounts 6050 or 1600 for tenant ${tenantId}`);
        return;
      }

      const amtStr = amount.toFixed(2);
      const today = new Date().toISOString().split('T')[0];

      const [entry] = await this.db
        .insert(journalEntries)
        .values({
          tenantId,
          entryNumber: `JE-DEP-${asset.id.substring(0, 8)}-${today}`,
          date: today,
          description: `Monthly depreciation: ${asset.name}`,
          status: 'posted',
          totalDebit: amtStr,
          totalCredit: amtStr,
          postedDate: new Date().toISOString().split('T')[0],
          sourceId: asset.id,
        })
        .returning();

      await this.db.insert(journalLines).values([
        {
          tenantId,
          journalEntryId: entry.id,
          lineNumber: 1,
          accountId: depExpenseAcct.id,
          debitAmount: amtStr,
          creditAmount: '0',
          description: `Depreciation: ${asset.name}`,
        },
        {
          tenantId,
          journalEntryId: entry.id,
          lineNumber: 2,
          accountId: accumDepAcct.id,
          debitAmount: '0',
          creditAmount: amtStr,
          description: `Accumulated depreciation: ${asset.name}`,
        },
      ]);

      this.logger.log(`Depreciation GL posted for ${asset.name}: ₹${amtStr}`);
    } catch (error) {
      this.logger.error(`Failed to post depreciation GL for ${asset.name}:`, error);
    }
  }

  async softDelete(tenantId: string, id: string) {
    const asset = await this.findById(tenantId, id);

    if (asset.status !== 'draft') {
      throw new BadRequestException('Only draft assets can be deleted');
    }

    const [deleted] = await this.db
      .update(assets)
      .set({ deletedAt: new Date() })
      .where(and(eq(assets.id, id), eq(assets.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateAssetNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `AST-${year}-`;

    const [latest] = await this.db
      .select({ assetNumber: assets.assetNumber })
      .from(assets)
      .where(
        and(
          eq(assets.tenantId, tenantId),
          like(assets.assetNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${assets.assetNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.assetNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
