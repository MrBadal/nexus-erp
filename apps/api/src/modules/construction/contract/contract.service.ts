import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  constructionContracts,
  boqItems,
  type NewConstructionContract,
  type NewBoqItem,
} from '../../../database/schema/index.js';

interface CreateContractDto {
  name: string;
  clientName: string;
  clientGstin?: string;
  contractType?: string;
  contractValue: string;
  gstRate?: string;
  retentionPercentage?: string;
  mobilisationAdvance?: string;
  startDate?: string;
  endDate?: string;
  projectLocation?: string;
  state?: string;
  isReraApplicable?: boolean;
  reraNumber?: string;
  isBocwApplicable?: boolean;
  notes?: string;
}

interface CreateBoqItemDto {
  itemCode: string;
  description: string;
  itemType?: string;
  unit: string;
  quantity: string;
  rate: string;
  parentId?: string;
  sortOrder?: number;
  isProvisional?: boolean;
}

@Injectable()
export class ContractService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: { status?: string; search?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(constructionContracts.tenantId, tenantId),
      isNull(constructionContracts.deletedAt),
    ];

    if (options?.status) {
      conditions.push(eq(constructionContracts.status, options.status as any));
    }

    if (options?.search) {
      conditions.push(like(constructionContracts.name, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(constructionContracts)
      .where(and(...conditions))
      .orderBy(desc(constructionContracts.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findById(tenantId: string, id: string) {
    const [contract] = await this.db
      .select()
      .from(constructionContracts)
      .where(
        and(
          eq(constructionContracts.id, id),
          eq(constructionContracts.tenantId, tenantId),
          isNull(constructionContracts.deletedAt),
        ),
      )
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract with ID "${id}" not found`);
    }

    const boq = await this.db
      .select()
      .from(boqItems)
      .where(and(eq(boqItems.contractId, id), isNull(boqItems.deletedAt)))
      .orderBy(boqItems.sortOrder);

    return { ...contract, boqItems: boq };
  }

  async create(tenantId: string, userId: string, data: CreateContractDto) {
    const contractNumber = await this.generateContractNumber(tenantId);
    const amount = parseFloat(data.contractValue);
    const gstRate = parseFloat(data.gstRate || '12');
    const gstAmount = amount * (gstRate / 100);

    const [contract] = await this.db
      .insert(constructionContracts)
      .values({
        tenantId,
        contractNumber,
        name: data.name,
        clientName: data.clientName,
        clientGstin: data.clientGstin || null,
        contractType: (data.contractType as any) || 'item_rate',
        status: 'draft',
        contractValue: data.contractValue,
        gstRate: data.gstRate || '12',
        retentionPercentage: data.retentionPercentage || '5',
        mobilisationAdvance: data.mobilisationAdvance || '0',
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        projectLocation: data.projectLocation || null,
        state: data.state || null,
        isReraApplicable: data.isReraApplicable ?? false,
        reraNumber: data.reraNumber || null,
        isBocwApplicable: data.isBocwApplicable ?? true,
        totalBilled: '0',
        totalReceived: '0',
        retentionHeld: '0',
        completionPercentage: '0',
        notes: data.notes || null,
        createdBy: userId,
      })
      .returning();

    return this.findById(tenantId, contract.id);
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(constructionContracts)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(constructionContracts.id, id), eq(constructionContracts.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async addBoqItems(tenantId: string, contractId: string, items: CreateBoqItemDto[]) {
    await this.findById(tenantId, contractId);

    const values: NewBoqItem[] = items.map((item) => {
      const qty = parseFloat(item.quantity);
      const rate = parseFloat(item.rate);
      return {
        tenantId,
        contractId,
        itemCode: item.itemCode,
        description: item.description,
        itemType: (item.itemType as any) || 'civil',
        unit: item.unit,
        quantity: item.quantity,
        rate: item.rate,
        amount: (qty * rate).toFixed(2),
        quantityExecuted: '0',
        amountBilled: '0',
        parentId: item.parentId || null,
        sortOrder: item.sortOrder ?? 0,
        isProvisional: item.isProvisional ?? false,
      };
    });

    await this.db.insert(boqItems).values(values);
    return this.findById(tenantId, contractId);
  }

  async softDelete(tenantId: string, id: string) {
    const contract = await this.findById(tenantId, id);

    if (!['draft', 'tendering'].includes(contract.status)) {
      throw new BadRequestException('Only draft or tendering contracts can be deleted');
    }

    const [deleted] = await this.db
      .update(constructionContracts)
      .set({ deletedAt: new Date() })
      .where(and(eq(constructionContracts.id, id), eq(constructionContracts.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateContractNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CON-${year}-`;

    const all = await this.db
      .select({ contractNumber: constructionContracts.contractNumber })
      .from(constructionContracts)
      .where(
        and(
          eq(constructionContracts.tenantId, tenantId),
          like(constructionContracts.contractNumber, `${prefix}%`),
        ),
      );

    return `${prefix}${(all.length + 1).toString().padStart(4, '0')}`;
  }
}
