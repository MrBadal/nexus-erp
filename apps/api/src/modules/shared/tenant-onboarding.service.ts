import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import {
  accounts,
  taxRates,
  fiscalPeriods,
  warehouses,
  businessSettings,
  numberSeries,
  roles,
} from '../../database/schema/index.js';
import { NumberSeriesService } from './number-series.service.js';
import { ROLE_PERMISSIONS } from '../../common/permissions.constants.js';

// Inline default chart of accounts to avoid cross-package dependency
const DEFAULT_CHART_OF_ACCOUNTS: { code: string; name: string; type: string; is_header: boolean }[] = [
  // Assets (1000-1999)
  { code: '1000', name: 'Assets', type: 'asset', is_header: true },
  { code: '1010', name: 'Cash on Hand', type: 'asset', is_header: false },
  { code: '1020', name: 'Bank Account', type: 'asset', is_header: false },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', is_header: false },
  { code: '1200', name: 'Inventory', type: 'asset', is_header: false },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset', is_header: false },
  { code: '1500', name: 'Fixed Assets', type: 'asset', is_header: true },
  { code: '1510', name: 'Equipment', type: 'asset', is_header: false },
  { code: '1520', name: 'Furniture & Fixtures', type: 'asset', is_header: false },
  { code: '1530', name: 'Vehicles', type: 'asset', is_header: false },
  { code: '1600', name: 'Accumulated Depreciation', type: 'contra_asset', is_header: false },
  // Liabilities (2000-2999)
  { code: '2000', name: 'Liabilities', type: 'liability', is_header: true },
  { code: '2010', name: 'Accounts Payable', type: 'liability', is_header: false },
  { code: '2100', name: 'Accrued Liabilities', type: 'liability', is_header: false },
  { code: '2200', name: 'Sales Tax Payable', type: 'liability', is_header: false },
  { code: '2300', name: 'Unearned Revenue', type: 'liability', is_header: false },
  { code: '2500', name: 'Long-Term Debt', type: 'liability', is_header: false },
  // Equity (3000-3999)
  { code: '3000', name: 'Equity', type: 'equity', is_header: true },
  { code: '3010', name: "Owner's Equity", type: 'equity', is_header: false },
  { code: '3020', name: 'Retained Earnings', type: 'equity', is_header: false },
  { code: '3030', name: 'Dividends', type: 'contra_equity', is_header: false },
  // Revenue (4000-4999)
  { code: '4000', name: 'Revenue', type: 'revenue', is_header: true },
  { code: '4010', name: 'Sales Revenue', type: 'revenue', is_header: false },
  { code: '4020', name: 'Service Revenue', type: 'revenue', is_header: false },
  { code: '4100', name: 'Other Income', type: 'revenue', is_header: false },
  { code: '4200', name: 'Sales Returns & Allowances', type: 'contra_revenue', is_header: false },
  { code: '4300', name: 'Sales Discounts', type: 'contra_revenue', is_header: false },
  // COGS (5000-5999)
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', is_header: true },
  { code: '5010', name: 'Material Costs', type: 'expense', is_header: false },
  { code: '5020', name: 'Labor Costs', type: 'expense', is_header: false },
  { code: '5030', name: 'Manufacturing Overhead', type: 'expense', is_header: false },
  // Operating Expenses (6000-6999)
  { code: '6000', name: 'Operating Expenses', type: 'expense', is_header: true },
  { code: '6010', name: 'Rent Expense', type: 'expense', is_header: false },
  { code: '6020', name: 'Utilities Expense', type: 'expense', is_header: false },
  { code: '6030', name: 'Office Supplies', type: 'expense', is_header: false },
  { code: '6040', name: 'Insurance Expense', type: 'expense', is_header: false },
  { code: '6050', name: 'Depreciation Expense', type: 'expense', is_header: false },
  { code: '6060', name: 'Salaries & Wages', type: 'expense', is_header: false },
  { code: '6070', name: 'Marketing & Advertising', type: 'expense', is_header: false },
  { code: '6080', name: 'Travel & Entertainment', type: 'expense', is_header: false },
  { code: '6090', name: 'Professional Fees', type: 'expense', is_header: false },
  { code: '6100', name: 'Bank Charges & Fees', type: 'expense', is_header: false },
  { code: '6200', name: 'Miscellaneous Expense', type: 'expense', is_header: false },
];

type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense'
  | 'contra_asset'
  | 'contra_liability'
  | 'contra_equity'
  | 'contra_revenue'
  | 'contra_expense';

function getNormalBalance(type: AccountType): 'debit' | 'credit' {
  switch (type) {
    case 'asset':
    case 'expense':
    case 'contra_liability':
    case 'contra_equity':
    case 'contra_revenue':
      return 'debit';
    case 'liability':
    case 'equity':
    case 'revenue':
    case 'contra_asset':
    case 'contra_expense':
      return 'credit';
  }
}

function getFinancialStatement(type: AccountType): 'balance_sheet' | 'income_statement' {
  switch (type) {
    case 'asset':
    case 'liability':
    case 'equity':
    case 'contra_asset':
    case 'contra_liability':
    case 'contra_equity':
      return 'balance_sheet';
    case 'revenue':
    case 'expense':
    case 'contra_revenue':
    case 'contra_expense':
      return 'income_statement';
  }
}

/**
 * Handles post-registration tenant onboarding.
 * Listens to 'auth.register' event and seeds all defaults:
 * - Chart of Accounts
 * - Default Tax Rates (GST: 0%, 5%, 12%, 18%, 28%)
 * - Current Fiscal Period
 * - Default Warehouse
 * - Business Settings
 * - Number Series
 * - Additional Roles (Accountant, Viewer)
 */
@Injectable()
export class TenantOnboardingService {
  private readonly logger = new Logger(TenantOnboardingService.name);

  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
  ) {}

  @OnEvent('auth.register')
  async handleTenantRegistration(payload: {
    userId: string;
    tenantId: string;
    tenantSlug: string;
  }) {
    const { tenantId, tenantSlug } = payload;
    this.logger.log(`Starting onboarding for tenant ${tenantSlug} (${tenantId})`);

    try {
      await this.seedChartOfAccounts(tenantId);
      await this.seedTaxRates(tenantId);
      await this.seedFiscalPeriod(tenantId);
      await this.seedDefaultWarehouse(tenantId);
      await this.seedBusinessSettings(tenantId);
      await this.seedNumberSeries(tenantId);
      await this.seedAdditionalRoles(tenantId);

      this.logger.log(`Onboarding completed for tenant ${tenantSlug}`);
    } catch (error) {
      this.logger.error(`Onboarding failed for tenant ${tenantSlug}:`, error);
      // Don't throw — registration should still succeed even if seeding partially fails
    }
  }

  private async seedChartOfAccounts(tenantId: string) {
    const accountRows = DEFAULT_CHART_OF_ACCOUNTS.map((acct) => {
      const acctType = acct.type as AccountType;
      return {
        tenantId,
        code: acct.code,
        name: acct.name,
        accountType: acctType,
        normalBalance: getNormalBalance(acctType),
        financialStatement: getFinancialStatement(acctType),
        isHeader: acct.is_header,
        isSystem: true,
        isActive: true,
        currencyCode: 'INR',
        openingBalance: '0',
        currentBalance: '0',
      };
    });

    await this.db.insert(accounts).values(accountRows);
    this.logger.log(`  → ${accountRows.length} accounts created`);
  }

  private async seedTaxRates(tenantId: string) {
    const gstRates = [
      { name: 'GST Exempt', code: 'GST-0', rate: '0', scope: 'both' as const },
      { name: 'GST 5%', code: 'GST-5', rate: '5', scope: 'both' as const },
      { name: 'GST 12%', code: 'GST-12', rate: '12', scope: 'both' as const },
      { name: 'GST 18%', code: 'GST-18', rate: '18', scope: 'both' as const },
      { name: 'GST 28%', code: 'GST-28', rate: '28', scope: 'both' as const },
    ];

    await this.db.insert(taxRates).values(
      gstRates.map((tr) => ({
        tenantId,
        name: tr.name,
        code: tr.code,
        rate: tr.rate,
        type: 'percentage' as const,
        scope: tr.scope,
        isActive: true,
      })),
    );
    this.logger.log(`  → ${gstRates.length} tax rates created`);
  }

  private async seedFiscalPeriod(tenantId: string) {
    const now = new Date();
    const year = now.getFullYear();

    // Create a full-year fiscal period (Apr-Mar for Indian companies)
    const startDate = `${year}-04-01`;
    const endDate = `${year + 1}-03-31`;

    // If current month is before April, adjust to previous fiscal year
    const effectiveStart = now.getMonth() < 3 ? `${year - 1}-04-01` : startDate;
    const effectiveEnd = now.getMonth() < 3 ? `${year}-03-31` : endDate;

    await this.db.insert(fiscalPeriods).values({
      tenantId,
      name: `FY ${effectiveStart.substring(0, 4)}-${effectiveEnd.substring(2, 4)}`,
      type: 'year',
      startDate: effectiveStart,
      endDate: effectiveEnd,
      status: 'open',
    });
    this.logger.log(`  → Fiscal period created: FY ${effectiveStart.substring(0, 4)}-${effectiveEnd.substring(2, 4)}`);
  }

  private async seedDefaultWarehouse(tenantId: string) {
    await this.db.insert(warehouses).values({
      tenantId,
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      isDefault: true,
      isActive: true,
    });
    this.logger.log('  → Default warehouse created');
  }

  private async seedBusinessSettings(tenantId: string) {
    await this.db.insert(businessSettings).values({
      tenantId,
      defaultCurrency: 'INR',
      fiscalYearStartMonth: 4, // April
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      setupComplete: false,
    });
    this.logger.log('  → Business settings created');
  }

  private async seedNumberSeries(tenantId: string) {
    await this.numberSeriesService.seedDefaults(tenantId);
    this.logger.log('  → Number series seeded');
  }

  private async seedAdditionalRoles(tenantId: string) {
    await this.db.insert(roles).values([
      {
        tenantId,
        name: 'Accountant',
        slug: 'accountant',
        description: 'Finance module access',
        isSystem: true,
        hierarchyLevel: 50,
        permissions: ['finance:read', 'finance:write', 'reports:read', 'ess:read_holidays', 'notifications:read', 'notifications:write'],
      },
      {
        tenantId,
        name: 'Viewer',
        slug: 'viewer',
        // hr:read deliberately excluded: a read-only cross-module role should
        // not reach payroll, Form-16, statutory PF/ESI filings, or employee
        // master data. Narrower HR-specific read access (e.g. org-chart) is a
        // separate, purpose-built permission if it's ever genuinely needed --
        // not this one.
        description: 'Read-only access across most modules (excludes HR)',
        isSystem: true,
        hierarchyLevel: 10,
        permissions: [
          'finance:read', 'selling:read', 'buying:read', 'inventory:read',
          'crm:read', 'manufacturing:read', 'projects:read',
          'assets:read', 'quality:read', 'helpdesk:read', 'reports:read',
          'ess:read_holidays', 'notifications:read', 'notifications:write',
        ],
      },
      {
        tenantId,
        name: 'HR Manager',
        slug: 'hr_manager',
        description: 'Full HRMS access — employees, payroll, recruitment, performance, onboarding',
        isSystem: true,
        hierarchyLevel: 40,
        permissions: [...ROLE_PERMISSIONS.hr_manager],
      },
      {
        tenantId,
        name: 'HR Executive',
        slug: 'hr_executive',
        description: 'HR operations — attendance, leave, expense approvals, recruitment',
        isSystem: true,
        hierarchyLevel: 30,
        permissions: [...ROLE_PERMISSIONS.hr_executive],
      },
      {
        tenantId,
        name: 'Employee',
        slug: 'employee',
        description: 'Self-service portal access — view own profile, attendance, leave, payslips, expenses',
        isSystem: true,
        hierarchyLevel: 5,
        permissions: [...ROLE_PERMISSIONS.employee],
      },
      {
        tenantId,
        name: 'Sales Manager',
        slug: 'sales_manager',
        description: 'CRM — sees all leads, assigns to reps, manages the pipeline',
        isSystem: true,
        hierarchyLevel: 40,
        permissions: [...ROLE_PERMISSIONS.sales_manager],
      },
      {
        tenantId,
        name: 'Telecaller',
        slug: 'telecaller',
        description: 'Inside sales — works assigned + unassigned leads, logs calls, schedules follow-ups',
        isSystem: true,
        hierarchyLevel: 20,
        permissions: [...ROLE_PERMISSIONS.telecaller],
      },
    ]);
    this.logger.log('  → Accountant, Viewer, HR Manager, HR Executive, Employee, Sales Manager, Telecaller roles created');
  }
}
