import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  items,
  employees,
  contacts,
  accounts,
} from '../../database/schema/index.js';

interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

@Injectable()
export class ImportExportService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  /**
   * Parse CSV string into rows
   */
  parseCSV(csvContent: string): Record<string, string>[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || '').trim();
      });
      rows.push(row);
    }

    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Export data as CSV string
   */
  async exportData(tenantId: string, entityType: string): Promise<string> {
    let data: Record<string, unknown>[];

    switch (entityType) {
      case 'items':
        data = await this.db.select().from(items).where(and(eq(items.tenantId, tenantId), isNull(items.deletedAt)));
        break;
      case 'employees':
        data = await this.db.select().from(employees).where(and(eq(employees.tenantId, tenantId), isNull(employees.deletedAt)));
        break;
      case 'contacts':
        data = await this.db.select().from(contacts).where(and(eq(contacts.tenantId, tenantId), isNull(contacts.deletedAt)));
        break;
      case 'accounts':
        data = await this.db.select().from(accounts).where(and(eq(accounts.tenantId, tenantId), isNull(accounts.deletedAt)));
        break;
      default:
        throw new BadRequestException(`Export not supported for entity type: ${entityType}`);
    }

    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Import items from CSV
   */
  async importItems(tenantId: string, csvContent: string, columnMapping?: ColumnMapping[]): Promise<ImportResult> {
    const rows = this.parseCSV(csvContent);
    const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = this.applyMapping(rows[i], columnMapping);
        const name = row.name || row.item_name || row.Name;
        const code = row.code || row.item_code || row.Code || row.SKU;

        if (!name) {
          result.errors.push({ row: i + 2, error: 'Missing name' });
          result.skipped++;
          continue;
        }

        await this.db.insert(items).values({
          tenantId,
          name,
          code: code || name.substring(0, 20).toUpperCase().replace(/\s/g, '-'),
          description: row.description || row.Description || undefined,
          sellingPrice: row.sellingPrice || row.selling_price || row.price || '0',
          purchasePrice: row.purchasePrice || row.purchase_price || row.cost || '0',
          hsnCode: row.hsnCode || row.hsn_code || row.HSN || undefined,
          taxRate: row.taxRate || row.tax_rate || row.gstRate || '0',
        });
        result.imported++;
      } catch (err) {
        result.errors.push({ row: i + 2, error: err instanceof Error ? err.message : 'Unknown error' });
        result.skipped++;
      }
    }

    return result;
  }

  /**
   * Import employees from CSV
   */
  async importEmployees(tenantId: string, csvContent: string, columnMapping?: ColumnMapping[]): Promise<ImportResult> {
    const rows = this.parseCSV(csvContent);
    const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = this.applyMapping(rows[i], columnMapping);
        const firstName = row.firstName || row.first_name || row.FirstName;
        const lastName = row.lastName || row.last_name || row.LastName || '';
        const email = row.email || row.Email;

        if (!firstName || !email) {
          result.errors.push({ row: i + 2, error: 'Missing firstName or email' });
          result.skipped++;
          continue;
        }

        const employeeId = row.employeeId || row.employee_id || `EMP-${String(i + 1).padStart(4, '0')}`;
        const dateOfJoining = row.dateOfJoining || row.date_of_joining || new Date().toISOString().split('T')[0];

        await this.db.insert(employees).values({
          tenantId,
          employeeId,
          firstName,
          lastName,
          email,
          phone: row.phone || row.Phone || null,
          dateOfJoining,
        });
        result.imported++;
      } catch (err) {
        result.errors.push({ row: i + 2, error: err instanceof Error ? err.message : 'Unknown error' });
        result.skipped++;
      }
    }

    return result;
  }

  /**
   * Import contacts from CSV
   */
  async importContacts(tenantId: string, csvContent: string, columnMapping?: ColumnMapping[]): Promise<ImportResult> {
    const rows = this.parseCSV(csvContent);
    const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = this.applyMapping(rows[i], columnMapping);
        const firstName = row.firstName || row.first_name || row.FirstName || row.name?.split(' ')[0];
        const lastName = row.lastName || row.last_name || row.LastName || row.name?.split(' ').slice(1).join(' ') || '';

        if (!firstName) {
          result.errors.push({ row: i + 2, error: 'Missing firstName' });
          result.skipped++;
          continue;
        }

        await this.db.insert(contacts).values({
          tenantId,
          firstName,
          lastName,
          email: row.email || row.Email || null,
          phone: row.phone || row.Phone || null,
          company: row.company || row.Company || null,
          jobTitle: row.jobTitle || row.job_title || null,
          type: (row.type as 'customer' | 'vendor' | 'lead') || 'lead',
        });
        result.imported++;
      } catch (err) {
        result.errors.push({ row: i + 2, error: err instanceof Error ? err.message : 'Unknown error' });
        result.skipped++;
      }
    }

    return result;
  }

  private applyMapping(row: Record<string, string>, mapping?: ColumnMapping[]): Record<string, string> {
    if (!mapping?.length) return row;

    const mapped: Record<string, string> = {};
    for (const m of mapping) {
      if (row[m.csvColumn] !== undefined) {
        mapped[m.dbColumn] = row[m.csvColumn];
      }
    }
    return { ...row, ...mapped };
  }
}
