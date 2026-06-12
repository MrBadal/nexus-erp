import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { assetCategories } from '../../../database/schema/index.js';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto.js';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto.js';

@Injectable()
export class AssetCategoryService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(assetCategories.tenantId, tenantId),
      isNull(assetCategories.deletedAt),
    ];

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(assetCategories.name, searchTerm));
    }

    const result = await this.db
      .select()
      .from(assetCategories)
      .where(and(...conditions))
      .orderBy(desc(assetCategories.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [category] = await this.db
      .select()
      .from(assetCategories)
      .where(
        and(
          eq(assetCategories.id, id),
          eq(assetCategories.tenantId, tenantId),
          isNull(assetCategories.deletedAt),
        ),
      )
      .limit(1);

    if (!category) {
      throw new NotFoundException(`Asset category with ID "${id}" not found`);
    }

    return category;
  }

  async create(tenantId: string, data: CreateAssetCategoryDto) {
    const [category] = await this.db
      .insert(assetCategories)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        depreciationMethod: (data.depreciationMethod as 'straight_line' | 'declining_balance' | 'double_declining' | 'units_of_production') || 'straight_line',
        usefulLife: data.usefulLife || 60,
        accountId: data.accountId || null,
        isActive: true,
      })
      .returning();

    return category;
  }

  async update(tenantId: string, id: string, data: UpdateAssetCategoryDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.depreciationMethod !== undefined) updateData.depreciationMethod = data.depreciationMethod;
    if (data.usefulLife !== undefined) updateData.usefulLife = data.usefulLife;
    if (data.accountId !== undefined) updateData.accountId = data.accountId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await this.db
      .update(assetCategories)
      .set(updateData)
      .where(and(eq(assetCategories.id, id), eq(assetCategories.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(assetCategories)
      .set({ deletedAt: new Date() })
      .where(and(eq(assetCategories.id, id), eq(assetCategories.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
