import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, and } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { contacts } from '../../../database/schema/index.js';
import { EVENTS } from '../../../common/events.constants.js';

/**
 * Listens for customer/supplier creation events and auto-creates
 * corresponding CRM contacts for unified contact management.
 */
@Injectable()
export class ContactSyncListener {
  private readonly logger = new Logger(ContactSyncListener.name);

  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  @OnEvent(EVENTS.CUSTOMER_CREATED)
  async handleCustomerCreated(payload: {
    tenantId: string;
    customerId: string;
    name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    company: string | null;
  }) {
    try {
      // Check if a contact with the same email already exists (avoid duplicates)
      if (payload.email) {
        const [existing] = await this.db
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.tenantId, payload.tenantId),
              eq(contacts.email, payload.email),
            ),
          )
          .limit(1);

        if (existing) {
          this.logger.log(`CRM contact already exists for email ${payload.email}, skipping sync`);
          return;
        }
      }

      // Split name into first/last
      const nameParts = payload.name.trim().split(/\s+/);
      const firstName = nameParts[0] || payload.name;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      await this.db.insert(contacts).values({
        tenantId: payload.tenantId,
        firstName,
        lastName: lastName || '',
        email: payload.email ?? undefined,
        phone: payload.phone ?? undefined,
        mobile: payload.mobile ?? undefined,
        company: payload.company ?? undefined,
        type: 'customer',
        status: 'active',
        source: 'other',
      });

      this.logger.log(`CRM contact synced for customer: ${payload.name}`);
    } catch (error) {
      this.logger.error(`Failed to sync CRM contact for customer ${payload.name}:`, error);
    }
  }

  @OnEvent(EVENTS.SUPPLIER_CREATED)
  async handleSupplierCreated(payload: {
    tenantId: string;
    supplierId: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    contactPerson: string | null;
  }) {
    try {
      // Check if a contact with the same email already exists
      if (payload.email) {
        const [existing] = await this.db
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.tenantId, payload.tenantId),
              eq(contacts.email, payload.email),
            ),
          )
          .limit(1);

        if (existing) {
          this.logger.log(`CRM contact already exists for email ${payload.email}, skipping sync`);
          return;
        }
      }

      // Use contact person name if available, otherwise company/supplier name
      const contactName = payload.contactPerson || payload.name;
      const nameParts = contactName.trim().split(/\s+/);
      const firstName = nameParts[0] || contactName;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      await this.db.insert(contacts).values({
        tenantId: payload.tenantId,
        firstName,
        lastName: lastName || '',
        email: payload.email ?? undefined,
        phone: payload.phone ?? undefined,
        company: payload.company || payload.name,
        type: 'vendor',
        status: 'active',
        source: 'other',
      });

      this.logger.log(`CRM contact synced for supplier: ${payload.name}`);
    } catch (error) {
      this.logger.error(`Failed to sync CRM contact for supplier ${payload.name}:`, error);
    }
  }
}
