import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  boms,
  bomItems,
} from '../../../database/schema/index.js';
import { CreateBomDto } from './dto/create-bom.dto.js';
import { UpdateBomDto } from './dto/update-bom.dto.js';

@Injectable()
export class BomService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(boms.tenantId, tenantId),
      isNull(boms.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(boms.status, options.status as 'draft' | 'active' | 'inactive'),
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(like(boms.bomNumber, searchTerm));
    }

    const result = await this.db
      .select()
      .from(boms)
      .where(and(...conditions))
      .orderBy(desc(boms.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [bom] = await this.db
      .select()
      .from(boms)
      .where(
        and(
          eq(boms.id, id),
          eq(boms.tenantId, tenantId),
          isNull(boms.deletedAt),
        ),
      )
      .limit(1);

    if (!bom) {
      throw new NotFoundException(`BOM with ID "${id}" not found`);
    }

    const items = await this.db
      .select()
      .from(bomItems)
      .where(eq(bomItems.bomId, id));

    return { ...bom, items };
  }

  async create(tenantId: string, data: CreateBomDto) {
    const bomNumber = await this.generateBomNumber(tenantId);

    const itemData = data.items.map((item) => {
      const qty = parseFloat(item.quantity);
      const rate = parseFloat(item.rate || '0');
      const amount = qty * rate;

      return {
        ...item,
        amount: amount.toFixed(4),
        rate: rate.toFixed(4),
      };
    });

    const [bom] = await this.db
      .insert(boms)
      .values({
        tenantId,
        bomNumber,
        itemId: data.itemId,
        itemName: data.itemName,
        quantity: data.quantity || '1',
        uom: data.uom || 'Nos',
        isDefault: data.isDefault || false,
        status: 'draft',
        description: data.description || null,
      })
      .returning();

    if (itemData.length > 0) {
      await this.db.insert(bomItems).values(
        itemData.map((item) => ({
          tenantId,
          bomId: bom.id,
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          uom: item.uom || 'Nos',
          rate: item.rate,
          amount: item.amount,
          description: item.description || null,
        })),
      );
    }

    return this.findById(tenantId, bom.id);
  }

  async update(tenantId: string, id: string, data: UpdateBomDto) {
    const existing = await this.findById(tenantId, id);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft BOMs can be updated');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.uom !== undefined) updateData.uom = data.uom;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.description !== undefined) updateData.description = data.description;

    const [updated] = await this.db
      .update(boms)
      .set(updateData)
      .where(and(eq(boms.id, id), eq(boms.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    newStatus: 'active' | 'inactive',
  ) {
    const bom = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      draft: ['active'],
      active: ['inactive'],
      inactive: ['active'],
    };

    const allowed = validTransitions[bom.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${bom.status}" to "${newStatus}"`,
      );
    }

    const updateValues: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'active') {
      updateValues.isActive = true;
    } else if (newStatus === 'inactive') {
      updateValues.isActive = false;
    }

    const [updated] = await this.db
      .update(boms)
      .set(updateValues)
      .where(and(eq(boms.id, id), eq(boms.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const bom = await this.findById(tenantId, id);

    if (bom.status === 'active') {
      throw new BadRequestException('Active BOMs cannot be deleted');
    }

    const [deleted] = await this.db
      .update(boms)
      .set({ deletedAt: new Date() })
      .where(and(eq(boms.id, id), eq(boms.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateBomNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BOM-${year}-`;

    const [latest] = await this.db
      .select({ bomNumber: boms.bomNumber })
      .from(boms)
      .where(
        and(
          eq(boms.tenantId, tenantId),
          like(boms.bomNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${boms.bomNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.bomNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
