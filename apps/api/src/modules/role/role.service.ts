import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { roles, type NewRole } from '../../database/schema/index.js';

@Injectable()
export class RoleService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId));
  }

  async findById(tenantId: string, id: string) {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
      .limit(1);

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`);
    }

    return role;
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      hierarchyLevel?: number;
      permissions: string[];
    },
  ) {
    // Check slug uniqueness within tenant
    const [existing] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.slug, data.slug), eq(roles.tenantId, tenantId)))
      .limit(1);

    if (existing) {
      throw new ConflictException(`Role slug "${data.slug}" already exists`);
    }

    const [role] = await this.db
      .insert(roles)
      .values({
        tenantId,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        hierarchyLevel: data.hierarchyLevel ?? 50,
        permissions: data.permissions as any,
        isSystem: false,
      })
      .returning();

    return role;
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      hierarchyLevel: number;
      permissions: string[];
    }>,
  ) {
    const existing = await this.findById(tenantId, id);

    if (existing.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (data.slug && data.slug !== existing.slug) {
      const [slugConflict] = await this.db
        .select()
        .from(roles)
        .where(and(eq(roles.slug, data.slug), eq(roles.tenantId, tenantId)))
        .limit(1);

      if (slugConflict) {
        throw new ConflictException(`Role slug "${data.slug}" already exists`);
      }
    }

    const [updated] = await this.db
      .update(roles)
      .set({
        ...data,
        permissions: data.permissions ? (data.permissions as any) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    await this.db
      .delete(roles)
      .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)));

    return { message: 'Role deleted successfully' };
  }
}
