import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, isNull, asc, desc, like, or, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  items,
  itemCategories,
  itemWarehouses,
  type NewItem,
  type NewItemCategory,
} from '../../../database/schema/index.js';
import { CreateItemDto, CreateItemCategoryDto } from './dto/create-item.dto.js';
import { UpdateItemDto, UpdateItemCategoryDto } from './dto/update-item.dto.js';

@Injectable()
export class ItemService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  // ─── Items ──────────────────────────────────────────────

  async findAllItems(
    tenantId: string,
    options?: {
      categoryId?: string;
      itemType?: string;
      isActive?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(items.tenantId, tenantId),
      isNull(items.deletedAt),
    ];

    if (options?.categoryId) {
      conditions.push(eq(items.categoryId, options.categoryId));
    }

    if (options?.itemType) {
      conditions.push(eq(items.itemType, options.itemType as 'stock' | 'service' | 'consumable'));
    }

    if (options?.isActive !== undefined) {
      conditions.push(eq(items.isActive, options.isActive === 'true'));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(
        or(
          like(items.name, searchTerm),
          like(items.code, searchTerm),
        )!,
      );
    }

    const result = await this.db
      .select()
      .from(items)
      .where(and(...conditions))
      .orderBy(asc(items.name))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findItemById(tenantId: string, id: string) {
    const [item] = await this.db
      .select()
      .from(items)
      .where(
        and(
          eq(items.id, id),
          eq(items.tenantId, tenantId),
          isNull(items.deletedAt),
        ),
      )
      .limit(1);

    if (!item) {
      throw new NotFoundException(`Item with ID "${id}" not found`);
    }

    // Fetch warehouse stock levels for this item
    const warehouseStock = await this.db
      .select()
      .from(itemWarehouses)
      .where(
        and(
          eq(itemWarehouses.itemId, id),
          eq(itemWarehouses.tenantId, tenantId),
        ),
      );

    return { ...item, warehouseStock };
  }

  async createItem(tenantId: string, data: CreateItemDto) {
    // Check code uniqueness within tenant
    const [existing] = await this.db
      .select()
      .from(items)
      .where(
        and(
          eq(items.code, data.code),
          eq(items.tenantId, tenantId),
          isNull(items.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Item code "${data.code}" already exists`);
    }

    // Validate category if provided
    if (data.categoryId) {
      const [category] = await this.db
        .select()
        .from(itemCategories)
        .where(
          and(
            eq(itemCategories.id, data.categoryId),
            eq(itemCategories.tenantId, tenantId),
            isNull(itemCategories.deletedAt),
          ),
        )
        .limit(1);

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    const [item] = await this.db
      .insert(items)
      .values({
        tenantId,
        name: data.name,
        code: data.code,
        description: data.description || null,
        categoryId: data.categoryId || null,
        itemType: (data.itemType as 'stock' | 'service' | 'consumable') || 'stock',
        unit: (data.unit as NewItem['unit']) || 'each',
        purchasePrice: data.purchasePrice || '0',
        sellingPrice: data.sellingPrice || '0',
        taxRate: data.taxRate || '0',
        isActive: data.isActive ?? true,
        imageUrl: data.imageUrl || null,
        minStockLevel: data.minStockLevel ?? 0,
        reorderQuantity: data.reorderQuantity ?? 0,
        weight: data.weight || null,
        dimensions: data.dimensions || null,
      })
      .returning();

    return item;
  }

  async updateItem(tenantId: string, id: string, data: UpdateItemDto) {
    const existing = await this.findItemById(tenantId, id);

    if (data.code && data.code !== existing.code) {
      const [codeConflict] = await this.db
        .select()
        .from(items)
        .where(
          and(
            eq(items.code, data.code),
            eq(items.tenantId, tenantId),
            isNull(items.deletedAt),
          ),
        )
        .limit(1);

      if (codeConflict) {
        throw new ConflictException(`Item code "${data.code}" already exists`);
      }
    }

    if (data.categoryId) {
      const [category] = await this.db
        .select()
        .from(itemCategories)
        .where(
          and(
            eq(itemCategories.id, data.categoryId),
            eq(itemCategories.tenantId, tenantId),
            isNull(itemCategories.deletedAt),
          ),
        )
        .limit(1);

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.itemType !== undefined) updateData.itemType = data.itemType;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
    if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.minStockLevel !== undefined) updateData.minStockLevel = data.minStockLevel;
    if (data.reorderQuantity !== undefined) updateData.reorderQuantity = data.reorderQuantity;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.dimensions !== undefined) updateData.dimensions = data.dimensions;

    const [updated] = await this.db
      .update(items)
      .set(updateData)
      .where(and(eq(items.id, id), eq(items.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDeleteItem(tenantId: string, id: string) {
    await this.findItemById(tenantId, id);

    // Check if item has stock in any warehouse
    const [stockRecord] = await this.db
      .select()
      .from(itemWarehouses)
      .where(
        and(
          eq(itemWarehouses.itemId, id),
          eq(itemWarehouses.tenantId, tenantId),
          sql`CAST(${itemWarehouses.quantity} AS DECIMAL) > 0`,
        ),
      )
      .limit(1);

    if (stockRecord) {
      throw new BadRequestException(
        'Cannot delete item with stock on hand. Set it as inactive instead.',
      );
    }

    const [deleted] = await this.db
      .update(items)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(items.id, id), eq(items.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  // ─── Categories ─────────────────────────────────────────

  async findAllCategories(tenantId: string) {
    const allCategories = await this.db
      .select()
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.tenantId, tenantId),
          isNull(itemCategories.deletedAt),
        ),
      )
      .orderBy(asc(itemCategories.name));

    return allCategories;
  }

  async getCategoryTree(tenantId: string) {
    const allCategories = await this.findAllCategories(tenantId);

    const categoryMap = new Map<string, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];

    for (const cat of allCategories) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of allCategories) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        (categoryMap.get(cat.parentId)!.children as Record<string, unknown>[]).push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async createCategory(tenantId: string, data: CreateItemCategoryDto) {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check slug uniqueness
    const [existing] = await this.db
      .select()
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.slug, slug),
          eq(itemCategories.tenantId, tenantId),
          isNull(itemCategories.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Category slug "${slug}" already exists`);
    }

    if (data.parentId) {
      const [parent] = await this.db
        .select()
        .from(itemCategories)
        .where(
          and(
            eq(itemCategories.id, data.parentId),
            eq(itemCategories.tenantId, tenantId),
            isNull(itemCategories.deletedAt),
          ),
        )
        .limit(1);

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const [category] = await this.db
      .insert(itemCategories)
      .values({
        tenantId,
        name: data.name,
        description: data.description || null,
        parentId: data.parentId || null,
        slug,
      })
      .returning();

    return category;
  }

  async updateCategory(tenantId: string, id: string, data: UpdateItemCategoryDto) {
    const [existing] = await this.db
      .select()
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.id, id),
          eq(itemCategories.tenantId, tenantId),
          isNull(itemCategories.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    if (data.parentId && data.parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    if (data.slug && data.slug !== existing.slug) {
      const [slugConflict] = await this.db
        .select()
        .from(itemCategories)
        .where(
          and(
            eq(itemCategories.slug, data.slug),
            eq(itemCategories.tenantId, tenantId),
            isNull(itemCategories.deletedAt),
          ),
        )
        .limit(1);

      if (slugConflict) {
        throw new ConflictException(`Category slug "${data.slug}" already exists`);
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.slug !== undefined) updateData.slug = data.slug;

    const [updated] = await this.db
      .update(itemCategories)
      .set(updateData)
      .where(and(eq(itemCategories.id, id), eq(itemCategories.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDeleteCategory(tenantId: string, id: string) {
    const [existing] = await this.db
      .select()
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.id, id),
          eq(itemCategories.tenantId, tenantId),
          isNull(itemCategories.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    // Check for child categories
    const [child] = await this.db
      .select()
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.parentId, id),
          eq(itemCategories.tenantId, tenantId),
          isNull(itemCategories.deletedAt),
        ),
      )
      .limit(1);

    if (child) {
      throw new BadRequestException(
        'Cannot delete category with child categories. Delete or reassign children first.',
      );
    }

    // Check for items in this category
    const [item] = await this.db
      .select()
      .from(items)
      .where(
        and(
          eq(items.categoryId, id),
          eq(items.tenantId, tenantId),
          isNull(items.deletedAt),
        ),
      )
      .limit(1);

    if (item) {
      throw new BadRequestException(
        'Cannot delete category with items. Reassign items first.',
      );
    }

    const [deleted] = await this.db
      .update(itemCategories)
      .set({ deletedAt: new Date() })
      .where(and(eq(itemCategories.id, id), eq(itemCategories.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
