import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, desc, SQL } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { employees } from '../../../database/schema/index.js';
import {
  employeeDocuments,
  type NewEmployeeDocument,
} from '../../../database/schema/hr-documents.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

export interface DocumentFilters {
  employeeId?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class EmployeeDocumentService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(tenantId: string, filters: DocumentFilters = {}) {
    const conditions: SQL[] = [
      eq(employeeDocuments.tenantId, tenantId),
      isNull(employeeDocuments.deletedAt),
    ];

    if (filters.employeeId) {
      conditions.push(eq(employeeDocuments.employeeId, filters.employeeId));
    }

    if (filters.type) {
      conditions.push(
        eq(
          employeeDocuments.type,
          filters.type as
            | 'offer_letter'
            | 'contract'
            | 'id_proof'
            | 'certificate'
            | 'payslip_archive'
            | 'other',
        ),
      );
    }

    const rows = await this.db
      .select({
        id: employeeDocuments.id,
        tenantId: employeeDocuments.tenantId,
        employeeId: employeeDocuments.employeeId,
        type: employeeDocuments.type,
        name: employeeDocuments.name,
        fileUrl: employeeDocuments.fileUrl,
        fileSize: employeeDocuments.fileSize,
        mimeType: employeeDocuments.mimeType,
        expiresAt: employeeDocuments.expiresAt,
        uploadedBy: employeeDocuments.uploadedBy,
        uploadedAt: employeeDocuments.uploadedAt,
        visibleToEmployee: employeeDocuments.visibleToEmployee,
        notes: employeeDocuments.notes,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeNumber: employees.employeeId,
      })
      .from(employeeDocuments)
      .leftJoin(employees, eq(employees.id, employeeDocuments.employeeId))
      .where(and(...conditions))
      .orderBy(desc(employeeDocuments.uploadedAt))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    return rows.map((r) => ({
      ...r,
      employeeName:
        r.employeeFirstName || r.employeeLastName
          ? `${r.employeeFirstName ?? ''} ${r.employeeLastName ?? ''}`.trim()
          : 'Unknown',
    }));
  }

  async findById(tenantId: string, id: string) {
    const [doc] = await this.db
      .select()
      .from(employeeDocuments)
      .where(
        and(
          eq(employeeDocuments.id, id),
          eq(employeeDocuments.tenantId, tenantId),
          isNull(employeeDocuments.deletedAt),
        ),
      )
      .limit(1);

    if (!doc) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }

    return doc;
  }

  async create(
    tenantId: string,
    uploadedBy: string,
    data: CreateDocumentDto,
  ) {
    // Validate employee belongs to tenant
    const [employee] = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.id, data.employeeId),
          eq(employees.tenantId, tenantId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const values: NewEmployeeDocument = {
      tenantId,
      employeeId: data.employeeId,
      type: data.type,
      name: data.name,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize ?? null,
      mimeType: data.mimeType ?? null,
      expiresAt: data.expiresAt ?? null,
      visibleToEmployee: data.visibleToEmployee ?? true,
      notes: data.notes ?? null,
      uploadedBy,
    };

    const [created] = await this.db
      .insert(employeeDocuments)
      .values(values)
      .returning();

    return created;
  }

  async update(tenantId: string, id: string, data: UpdateDocumentDto) {
    await this.findById(tenantId, id);

    const updates: Partial<NewEmployeeDocument> = {};
    if (data.type !== undefined) updates.type = data.type;
    if (data.name !== undefined) updates.name = data.name;
    if (data.fileUrl !== undefined) updates.fileUrl = data.fileUrl;
    if (data.fileSize !== undefined) updates.fileSize = data.fileSize;
    if (data.mimeType !== undefined) updates.mimeType = data.mimeType;
    if (data.expiresAt !== undefined) updates.expiresAt = data.expiresAt;
    if (data.visibleToEmployee !== undefined)
      updates.visibleToEmployee = data.visibleToEmployee;
    if (data.notes !== undefined) updates.notes = data.notes;

    const [updated] = await this.db
      .update(employeeDocuments)
      .set(updates)
      .where(
        and(
          eq(employeeDocuments.id, id),
          eq(employeeDocuments.tenantId, tenantId),
        ),
      )
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    await this.db
      .update(employeeDocuments)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(employeeDocuments.id, id),
          eq(employeeDocuments.tenantId, tenantId),
        ),
      );

    return { success: true };
  }

  /**
   * ESS-side list: returns only documents flagged `visibleToEmployee=true`
   * for the requesting employee.
   */
  async findMine(tenantId: string, employeeId: string) {
    const rows = await this.db
      .select({
        id: employeeDocuments.id,
        type: employeeDocuments.type,
        name: employeeDocuments.name,
        fileUrl: employeeDocuments.fileUrl,
        fileSize: employeeDocuments.fileSize,
        mimeType: employeeDocuments.mimeType,
        expiresAt: employeeDocuments.expiresAt,
        uploadedAt: employeeDocuments.uploadedAt,
        notes: employeeDocuments.notes,
      })
      .from(employeeDocuments)
      .where(
        and(
          eq(employeeDocuments.tenantId, tenantId),
          eq(employeeDocuments.employeeId, employeeId),
          eq(employeeDocuments.visibleToEmployee, true),
          isNull(employeeDocuments.deletedAt),
        ),
      )
      .orderBy(desc(employeeDocuments.uploadedAt));

    return rows;
  }

  /**
   * Returns a single document for the employee, enforcing the
   * employeeId + visibleToEmployee filter. Throws 404 otherwise.
   */
  async findMineById(tenantId: string, employeeId: string, id: string) {
    const [doc] = await this.db
      .select()
      .from(employeeDocuments)
      .where(
        and(
          eq(employeeDocuments.id, id),
          eq(employeeDocuments.tenantId, tenantId),
          eq(employeeDocuments.employeeId, employeeId),
          eq(employeeDocuments.visibleToEmployee, true),
          isNull(employeeDocuments.deletedAt),
        ),
      )
      .limit(1);

    if (!doc) {
      throw new NotFoundException(`Document with ID "${id}" not found`);
    }

    return doc;
  }
}
