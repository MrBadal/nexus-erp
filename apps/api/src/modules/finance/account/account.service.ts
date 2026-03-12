import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { accounts, journalLines, type NewAccount } from '../../../database/schema/index.js';

@Injectable()
export class AccountService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string) {
    return this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), isNull(accounts.deletedAt)))
      .orderBy(asc(accounts.code));
  }

  async findById(tenantId: string, id: string) {
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.tenantId, tenantId),
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);

    if (!account) {
      throw new NotFoundException(`Account with ID "${id}" not found`);
    }

    return account;
  }

  async getTree(tenantId: string) {
    const allAccounts = await this.findAll(tenantId);

    const accountMap = new Map<string, any>();
    const roots: any[] = [];

    // First pass: create map
    for (const acc of allAccounts) {
      accountMap.set(acc.id, { ...acc, children: [] });
    }

    // Second pass: build tree
    for (const acc of allAccounts) {
      const node = accountMap.get(acc.id)!;
      if (acc.parentId && accountMap.has(acc.parentId)) {
        accountMap.get(acc.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async create(
    tenantId: string,
    data: {
      code: string;
      name: string;
      accountType: string;
      parentId?: string;
      currencyCode?: string;
      description?: string;
      isHeader?: boolean;
      normalBalance: string;
      financialStatement: string;
      openingBalance?: string;
      taxRateId?: string;
    },
  ) {
    // Check code uniqueness within tenant
    const [existing] = await this.db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.code, data.code),
          eq(accounts.tenantId, tenantId),
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(`Account code "${data.code}" already exists`);
    }

    // Validate parent if provided
    if (data.parentId) {
      const [parent] = await this.db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, data.parentId),
            eq(accounts.tenantId, tenantId),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1);

      if (!parent) {
        throw new BadRequestException('Parent account not found');
      }

      if (!parent.isHeader) {
        throw new BadRequestException('Parent account must be a header account');
      }
    }

    const [account] = await this.db
      .insert(accounts)
      .values({
        tenantId,
        code: data.code,
        name: data.name,
        accountType: data.accountType as any,
        parentId: data.parentId || null,
        currencyCode: data.currencyCode || 'USD',
        description: data.description || null,
        isHeader: data.isHeader || false,
        isSystem: false,
        normalBalance: data.normalBalance as any,
        financialStatement: data.financialStatement as any,
        openingBalance: data.openingBalance || '0',
        currentBalance: data.openingBalance || '0',
        taxRateId: data.taxRateId || null,
      })
      .returning();

    return account;
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{
      code: string;
      name: string;
      description: string;
      isActive: boolean;
      parentId: string;
      taxRateId: string;
      currencyCode: string;
    }>,
  ) {
    const existing = await this.findById(tenantId, id);

    if (existing.isSystem) {
      throw new BadRequestException('System accounts cannot be modified');
    }

    if (data.code && data.code !== existing.code) {
      const [codeConflict] = await this.db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.code, data.code),
            eq(accounts.tenantId, tenantId),
            isNull(accounts.deletedAt),
          ),
        )
        .limit(1);

      if (codeConflict) {
        throw new ConflictException(`Account code "${data.code}" already exists`);
      }
    }

    // Prevent circular parent reference
    if (data.parentId && data.parentId === id) {
      throw new BadRequestException('Account cannot be its own parent');
    }

    const [updated] = await this.db
      .update(accounts)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    if (existing.isSystem) {
      throw new BadRequestException('System accounts cannot be deleted');
    }

    // Check for child accounts
    const [child] = await this.db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.parentId, id),
          eq(accounts.tenantId, tenantId),
          isNull(accounts.deletedAt),
        ),
      )
      .limit(1);

    if (child) {
      throw new BadRequestException(
        'Cannot delete account with child accounts. Delete or reassign children first.',
      );
    }

    // Check for journal lines
    const [line] = await this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.accountId, id))
      .limit(1);

    if (line) {
      throw new BadRequestException(
        'Cannot delete account with journal entries. Deactivate instead.',
      );
    }

    const [deleted] = await this.db
      .update(accounts)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
