import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { tenants, roles, type NewTenant } from '../../database/schema/index.js';

@Injectable()
export class TenantService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll() {
    return this.db
      .select()
      .from(tenants)
      .where(isNull(tenants.deletedAt));
  }

  async findById(id: string) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  async findBySlug(slug: string) {
    const [tenant] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.slug, slug), isNull(tenants.deletedAt)))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }

    return tenant;
  }

  async create(data: Omit<NewTenant, 'id' | 'createdAt' | 'updatedAt'>) {
    // Check slug uniqueness
    const [existing] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, data.slug))
      .limit(1);

    if (existing) {
      throw new ConflictException(`Tenant slug "${data.slug}" already exists`);
    }

    const [tenant] = await this.db
      .insert(tenants)
      .values(data)
      .returning();

    // Provision default roles
    await this.provisionDefaultRoles(tenant.id);

    return tenant;
  }

  async update(id: string, data: Partial<NewTenant>) {
    const existing = await this.findById(id);

    if (data.slug && data.slug !== existing.slug) {
      const [slugConflict] = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, data.slug))
        .limit(1);

      if (slugConflict) {
        throw new ConflictException(`Tenant slug "${data.slug}" already exists`);
      }
    }

    const [updated] = await this.db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    return updated;
  }

  async softDelete(id: string) {
    await this.findById(id);

    const [deleted] = await this.db
      .update(tenants)
      .set({ deletedAt: new Date(), status: 'cancelled' })
      .where(eq(tenants.id, id))
      .returning();

    return deleted;
  }

  private async provisionDefaultRoles(tenantId: string) {
    const defaultRoles = [
      {
        tenantId,
        name: 'Administrator',
        slug: 'admin',
        description: 'Full system access',
        isSystem: true,
        hierarchyLevel: 0,
        permissions: ['*'] as any,
      },
      {
        tenantId,
        name: 'Accountant',
        slug: 'accountant',
        description: 'Access to all finance modules',
        isSystem: true,
        hierarchyLevel: 10,
        permissions: [
          'finance:read',
          'finance:write',
          'accounts:read',
          'accounts:write',
          'journal:read',
          'journal:write',
          'journal:post',
          'invoices:read',
          'invoices:write',
          'invoices:send',
          'bills:read',
          'bills:write',
          'payments:read',
          'payments:write',
          'reports:read',
        ] as any,
      },
      {
        tenantId,
        name: 'Viewer',
        slug: 'viewer',
        description: 'Read-only access',
        isSystem: true,
        hierarchyLevel: 100,
        permissions: [
          'finance:read',
          'accounts:read',
          'journal:read',
          'invoices:read',
          'bills:read',
          'payments:read',
          'reports:read',
        ] as any,
      },
    ];

    await this.db.insert(roles).values(defaultRoles);
  }
}
