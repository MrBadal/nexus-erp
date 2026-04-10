import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, asc, like, or } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { suppliers } from '../../../database/schema/index.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';
import { EVENTS } from '../../../common/events.constants.js';

@Injectable()
export class SupplierService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
      eq(suppliers.tenantId, tenantId),
      isNull(suppliers.deletedAt),
    ];

    if (options?.status) {
      conditions.push(eq(suppliers.status, options.status as 'active' | 'inactive'));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(
        or(
          like(suppliers.name, searchTerm),
          like(suppliers.email, searchTerm),
          like(suppliers.company, searchTerm),
        )!,
      );
    }

    const result = await this.db
      .select()
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(asc(suppliers.name))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [supplier] = await this.db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, tenantId),
          isNull(suppliers.deletedAt),
        ),
      )
      .limit(1);

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    return supplier;
  }

  async create(tenantId: string, data: CreateSupplierDto) {
    const [supplier] = await this.db
      .insert(suppliers)
      .values({
        tenantId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        taxId: data.taxId || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        contactPerson: data.contactPerson || null,
        paymentTerms: data.paymentTerms || null,
        status: (data.status as 'active' | 'inactive') || 'active',
        rating: data.rating ?? 0,
        notes: data.notes || null,
        website: data.website || null,
        panNumber: data.panNumber || null,
        gstNumber: data.gstNumber || null,
        msmeRegistered: data.msmeRegistered ?? false,
        msmeCategory: (data.msmeCategory as 'micro' | 'small' | 'medium') || null,
        msmeNumber: data.msmeNumber || null,
        bankAccountName: data.bankAccountName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankIfscCode: data.bankIfscCode || null,
        bankName: data.bankName || null,
        bankBranch: data.bankBranch || null,
        tdsApplicable: data.tdsApplicable ?? true,
        defaultTdsSectionId: data.defaultTdsSectionId || null,
      })
      .returning();

    // Emit event for CRM contact sync
    this.eventEmitter.emit(EVENTS.SUPPLIER_CREATED, {
      tenantId,
      supplierId: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      company: supplier.company,
      contactPerson: supplier.contactPerson,
    });

    return supplier;
  }

  async update(tenantId: string, id: string, data: UpdateSupplierDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.panNumber !== undefined) updateData.panNumber = data.panNumber;
    if (data.gstNumber !== undefined) updateData.gstNumber = data.gstNumber;
    if (data.msmeRegistered !== undefined) updateData.msmeRegistered = data.msmeRegistered;
    if (data.msmeCategory !== undefined) updateData.msmeCategory = data.msmeCategory;
    if (data.msmeNumber !== undefined) updateData.msmeNumber = data.msmeNumber;
    if (data.bankAccountName !== undefined) updateData.bankAccountName = data.bankAccountName;
    if (data.bankAccountNumber !== undefined) updateData.bankAccountNumber = data.bankAccountNumber;
    if (data.bankIfscCode !== undefined) updateData.bankIfscCode = data.bankIfscCode;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankBranch !== undefined) updateData.bankBranch = data.bankBranch;
    if (data.tdsApplicable !== undefined) updateData.tdsApplicable = data.tdsApplicable;
    if (data.defaultTdsSectionId !== undefined) updateData.defaultTdsSectionId = data.defaultTdsSectionId;

    const [updated] = await this.db
      .update(suppliers)
      .set(updateData)
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(suppliers)
      .set({ deletedAt: new Date(), status: 'inactive' })
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
