import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, isNull, asc, like, or, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { customers } from '../../../database/schema/index.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { EVENTS } from '../../../common/events.constants.js';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      customerType?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(customers.tenantId, tenantId),
      isNull(customers.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(customers.status, options.status as 'active' | 'inactive' | 'blocked'),
      );
    }

    if (options?.customerType) {
      conditions.push(
        eq(customers.customerType, options.customerType as 'individual' | 'company'),
      );
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(
        or(
          like(customers.name, searchTerm),
          like(customers.email, searchTerm),
          like(customers.company, searchTerm),
          like(customers.customerNumber, searchTerm),
        )!,
      );
    }

    const result = await this.db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(asc(customers.name))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, id),
          eq(customers.tenantId, tenantId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return customer;
  }

  async create(tenantId: string, data: CreateCustomerDto) {
    // Generate customer number
    const customerNumber = await this.generateCustomerNumber(tenantId);

    const [customer] = await this.db
      .insert(customers)
      .values({
        tenantId,
        customerNumber,
        name: data.name,
        customerType: (data.customerType as 'individual' | 'company') || 'company',
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        company: data.company || null,
        taxId: data.taxId || null,
        website: data.website || null,
        billingAddress: data.billingAddress || null,
        billingCity: data.billingCity || null,
        billingState: data.billingState || null,
        billingCountry: data.billingCountry || null,
        billingPostalCode: data.billingPostalCode || null,
        shippingAddress: data.shippingAddress || null,
        shippingCity: data.shippingCity || null,
        shippingState: data.shippingState || null,
        shippingCountry: data.shippingCountry || null,
        shippingPostalCode: data.shippingPostalCode || null,
        creditLimit: data.creditLimit || '0',
        currency: data.currency || 'INR',
        paymentTerms: data.paymentTerms || null,
        status: (data.status as 'active' | 'inactive' | 'blocked') || 'active',
        notes: data.notes || null,
        assignedTo: data.assignedTo || null,
      })
      .returning();

    // Emit event for CRM contact sync
    this.eventEmitter.emit(EVENTS.CUSTOMER_CREATED, {
      tenantId,
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      mobile: customer.mobile,
      company: customer.company,
    });

    return customer;
  }

  async update(tenantId: string, id: string, data: UpdateCustomerDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.customerType !== undefined) updateData.customerType = data.customerType;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
    if (data.billingCity !== undefined) updateData.billingCity = data.billingCity;
    if (data.billingState !== undefined) updateData.billingState = data.billingState;
    if (data.billingCountry !== undefined) updateData.billingCountry = data.billingCountry;
    if (data.billingPostalCode !== undefined) updateData.billingPostalCode = data.billingPostalCode;
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
    if (data.shippingCity !== undefined) updateData.shippingCity = data.shippingCity;
    if (data.shippingState !== undefined) updateData.shippingState = data.shippingState;
    if (data.shippingCountry !== undefined) updateData.shippingCountry = data.shippingCountry;
    if (data.shippingPostalCode !== undefined) updateData.shippingPostalCode = data.shippingPostalCode;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

    const [updated] = await this.db
      .update(customers)
      .set(updateData)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(customers)
      .set({ deletedAt: new Date(), status: 'inactive' })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();

    return deleted;
  }

  private async generateCustomerNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CUST-${year}-`;

    const [latest] = await this.db
      .select({ customerNumber: customers.customerNumber })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          like(customers.customerNumber, `${prefix}%`),
        ),
      )
      .orderBy(sql`${customers.customerNumber} DESC`)
      .limit(1);

    let sequence = 1;
    if (latest) {
      const lastNum = parseInt(latest.customerNumber.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
  }
}
