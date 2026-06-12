import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  warehouses,
  itemWarehouses,
  stockMovements,
} from '../../../database/schema/index.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';

@Injectable()
export class WarehouseService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.tenantId, tenantId),
          isNull(warehouses.deletedAt),
        ),
      )
      .orderBy(asc(warehouses.name));
  }

  async findById(tenantId: string, id: string) {
    const [warehouse] = await this.db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, id),
          eq(warehouses.tenantId, tenantId),
          isNull(warehouses.deletedAt),
        ),
      )
      .limit(1);

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID "${id}" not found`);
    }

    return warehouse;
  }

  async create(tenantId: string, data: CreateWarehouseDto) {
    // Check code uniqueness within tenant
    const [existing] = await this.db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.code, data.code),
          eq(warehouses.tenantId, tenantId),
          isNull(warehouses.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Warehouse code "${data.code}" already exists`);
    }

    // If this is set as default, unset existing default
    if (data.isDefault) {
      await this.db
        .update(warehouses)
        .set({ isDefault: false })
        .where(
          and(
            eq(warehouses.tenantId, tenantId),
            eq(warehouses.isDefault, true),
            isNull(warehouses.deletedAt),
          ),
        );
    }

    const [warehouse] = await this.db
      .insert(warehouses)
      .values({
        tenantId,
        name: data.name,
        code: data.code,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
      })
      .returning();

    return warehouse;
  }

  async update(tenantId: string, id: string, data: UpdateWarehouseDto) {
    const existing = await this.findById(tenantId, id);

    if (data.code && data.code !== existing.code) {
      const [codeConflict] = await this.db
        .select()
        .from(warehouses)
        .where(
          and(
            eq(warehouses.code, data.code),
            eq(warehouses.tenantId, tenantId),
            isNull(warehouses.deletedAt),
          ),
        )
        .limit(1);

      if (codeConflict) {
        throw new ConflictException(`Warehouse code "${data.code}" already exists`);
      }
    }

    // If setting as default, unset existing default
    if (data.isDefault) {
      await this.db
        .update(warehouses)
        .set({ isDefault: false })
        .where(
          and(
            eq(warehouses.tenantId, tenantId),
            eq(warehouses.isDefault, true),
            isNull(warehouses.deletedAt),
          ),
        );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await this.db
      .update(warehouses)
      .set(updateData)
      .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.isDefault) {
      throw new BadRequestException(
        'Cannot delete the default warehouse. Set another warehouse as default first.',
      );
    }

    // Check for stock in this warehouse
    const stockRecords = await this.db
      .select()
      .from(itemWarehouses)
      .where(
        and(
          eq(itemWarehouses.warehouseId, id),
          eq(itemWarehouses.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (stockRecords.length > 0) {
      const hasStock = stockRecords.some(
        (r) => parseFloat(r.quantity) > 0,
      );
      if (hasStock) {
        throw new BadRequestException(
          'Cannot delete warehouse with stock on hand. Transfer stock first.',
        );
      }
    }

    const [deleted] = await this.db
      .update(warehouses)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
