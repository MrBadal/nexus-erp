/**
 * NexusERP Database Seed Script
 *
 * Creates demo tenant, roles, admin user, chart of accounts,
 * sample journal entries, and sample invoices.
 *
 * Usage: pnpm db:seed  (from apps/api/)
 *   or:  npx tsx src/database/seeds/index.ts
 *
 * Idempotent: safe to run multiple times (skips if demo tenant exists).
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

import {
  tenants,
  users,
  roles,
  accounts,
  journalEntries,
  journalLines,
  invoices,
  invoiceLines,
} from '../schema/index.js';

import { DEFAULT_CHART_OF_ACCOUNTS } from '@nexus-erp/config';
import { ROLE_PERMISSIONS } from '../../common/permissions.constants.js';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT) || 5432;
const database = process.env.DB_NAME || 'nexuserp';
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'postgres';

const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuid(): string {
  return crypto.randomUUID();
}

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

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log('=== NexusERP Database Seed ===\n');

  // ── 1. Check idempotency ────────────────────────────────────────────────
  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'demo'))
    .limit(1);

  if (existing.length > 0) {
    console.log('Demo tenant already exists. Skipping seed.');
    await client.end();
    return;
  }

  // ── 2. Create demo tenant ───────────────────────────────────────────────
  console.log('Creating demo tenant...');
  const tenantId = uuid();

  await db.insert(tenants).values({
    id: tenantId,
    name: 'Demo Company',
    slug: 'demo',
    status: 'active',
    billingEmail: 'admin@demo.nexuserp.com',
    primaryColor: '#1B4F72',
    secondaryColor: '#2874A6',
    maxUsers: 10,
    storageLimitGb: 5,
    settings: {},
  });

  // ── 3. Create roles ─────────────────────────────────────────────────────
  console.log('Creating roles...');
  const adminRoleId = uuid();
  const accountantRoleId = uuid();
  const viewerRoleId = uuid();

  await db.insert(roles).values([
    {
      id: adminRoleId,
      tenantId,
      name: 'Admin',
      slug: 'admin',
      description: 'Full system access',
      isSystem: true,
      hierarchyLevel: 100,
      permissions: [...ROLE_PERMISSIONS.admin],
    },
    {
      id: accountantRoleId,
      tenantId,
      name: 'Accountant',
      slug: 'accountant',
      description: 'Finance module access',
      isSystem: true,
      hierarchyLevel: 50,
      permissions: [...ROLE_PERMISSIONS.accountant],
    },
    {
      id: viewerRoleId,
      tenantId,
      name: 'Viewer',
      slug: 'viewer',
      description: 'Read-only access',
      isSystem: true,
      hierarchyLevel: 10,
      permissions: [...ROLE_PERMISSIONS.viewer],
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
  ]);

  // ── 4. Create admin user ────────────────────────────────────────────────
  console.log('Creating admin user...');
  const adminUserId = uuid();
  const passwordHash = await bcrypt.hash('Demo@12345678', 12);

  await db.insert(users).values({
    id: adminUserId,
    tenantId,
    email: 'admin@demo.nexuserp.com',
    passwordHash,
    firstName: 'Admin',
    lastName: 'User',
    status: 'active',
    roleId: adminRoleId,
    emailVerifiedAt: new Date(),
  });

  // ── 5. Create chart of accounts ─────────────────────────────────────────
  console.log('Creating chart of accounts...');

  // Build a lookup map: code -> id so we can reference accounts later
  const accountIdMap = new Map<string, string>();

  const accountRows = DEFAULT_CHART_OF_ACCOUNTS.map((acct) => {
    const id = uuid();
    accountIdMap.set(acct.code, id);
    const acctType = acct.type as AccountType;
    return {
      id,
      tenantId,
      code: acct.code,
      name: acct.name,
      accountType: acctType,
      normalBalance: getNormalBalance(acctType),
      financialStatement: getFinancialStatement(acctType),
      isHeader: acct.is_header,
      isSystem: true,
      isActive: true,
      currencyCode: 'USD',
      openingBalance: '0',
      currentBalance: '0',
    };
  });

  await db.insert(accounts).values(accountRows);

  // ── 6. Sample journal entries ───────────────────────────────────────────
  console.log('Creating sample journal entries...');

  // Helper to get account id by code
  const acctId = (code: string): string => {
    const id = accountIdMap.get(code);
    if (!id) throw new Error(`Account code ${code} not found in chart of accounts`);
    return id;
  };

  // JE-1: Opening Balances
  const je1Id = uuid();
  await db.insert(journalEntries).values({
    id: je1Id,
    tenantId,
    entryNumber: 'JE-2026-000001',
    date: '2026-01-01',
    postedDate: '2026-01-01',
    description: 'Opening Balances',
    sourceType: 'opening',
    status: 'posted',
    currencyCode: 'USD',
    exchangeRate: '1',
    totalDebit: '50000.0000',
    totalCredit: '50000.0000',
    createdBy: adminUserId,
  });

  await db.insert(journalLines).values([
    {
      id: uuid(),
      tenantId,
      journalEntryId: je1Id,
      lineNumber: 1,
      accountId: acctId('1010'),
      description: 'Cash on Hand - opening balance',
      debitAmount: '50000.0000',
      creditAmount: '0',
      baseDebitAmount: '50000.0000',
      baseCreditAmount: '0',
    },
    {
      id: uuid(),
      tenantId,
      journalEntryId: je1Id,
      lineNumber: 2,
      accountId: acctId('3010'),
      description: "Owner's Equity - opening balance",
      debitAmount: '0',
      creditAmount: '50000.0000',
      baseDebitAmount: '0',
      baseCreditAmount: '50000.0000',
    },
  ]);

  // JE-2: Office Rent
  const je2Id = uuid();
  await db.insert(journalEntries).values({
    id: je2Id,
    tenantId,
    entryNumber: 'JE-2026-000002',
    date: '2026-01-15',
    postedDate: '2026-01-15',
    description: 'Office Rent - January 2026',
    sourceType: 'manual',
    status: 'posted',
    currencyCode: 'USD',
    exchangeRate: '1',
    totalDebit: '3500.0000',
    totalCredit: '3500.0000',
    createdBy: adminUserId,
  });

  await db.insert(journalLines).values([
    {
      id: uuid(),
      tenantId,
      journalEntryId: je2Id,
      lineNumber: 1,
      accountId: acctId('6010'),
      description: 'Rent Expense',
      debitAmount: '3500.0000',
      creditAmount: '0',
      baseDebitAmount: '3500.0000',
      baseCreditAmount: '0',
    },
    {
      id: uuid(),
      tenantId,
      journalEntryId: je2Id,
      lineNumber: 2,
      accountId: acctId('1010'),
      description: 'Cash on Hand',
      debitAmount: '0',
      creditAmount: '3500.0000',
      baseDebitAmount: '0',
      baseCreditAmount: '3500.0000',
    },
  ]);

  // JE-3: Sales Revenue
  const je3Id = uuid();
  await db.insert(journalEntries).values({
    id: je3Id,
    tenantId,
    entryNumber: 'JE-2026-000003',
    date: '2026-02-01',
    postedDate: '2026-02-01',
    description: 'Sales Revenue - Client Project Alpha',
    sourceType: 'invoice',
    status: 'posted',
    currencyCode: 'USD',
    exchangeRate: '1',
    totalDebit: '12500.0000',
    totalCredit: '12500.0000',
    createdBy: adminUserId,
  });

  await db.insert(journalLines).values([
    {
      id: uuid(),
      tenantId,
      journalEntryId: je3Id,
      lineNumber: 1,
      accountId: acctId('1100'),
      description: 'Accounts Receivable',
      debitAmount: '12500.0000',
      creditAmount: '0',
      baseDebitAmount: '12500.0000',
      baseCreditAmount: '0',
    },
    {
      id: uuid(),
      tenantId,
      journalEntryId: je3Id,
      lineNumber: 2,
      accountId: acctId('4010'),
      description: 'Sales Revenue',
      debitAmount: '0',
      creditAmount: '12500.0000',
      baseDebitAmount: '0',
      baseCreditAmount: '12500.0000',
    },
  ]);

  // JE-4: Office Supplies Purchase
  const je4Id = uuid();
  await db.insert(journalEntries).values({
    id: je4Id,
    tenantId,
    entryNumber: 'JE-2026-000004',
    date: '2026-02-10',
    postedDate: '2026-02-10',
    description: 'Office Supplies Purchase',
    sourceType: 'manual',
    status: 'posted',
    currencyCode: 'USD',
    exchangeRate: '1',
    totalDebit: '850.0000',
    totalCredit: '850.0000',
    createdBy: adminUserId,
  });

  await db.insert(journalLines).values([
    {
      id: uuid(),
      tenantId,
      journalEntryId: je4Id,
      lineNumber: 1,
      accountId: acctId('6030'),
      description: 'Office Supplies',
      debitAmount: '850.0000',
      creditAmount: '0',
      baseDebitAmount: '850.0000',
      baseCreditAmount: '0',
    },
    {
      id: uuid(),
      tenantId,
      journalEntryId: je4Id,
      lineNumber: 2,
      accountId: acctId('1010'),
      description: 'Cash on Hand',
      debitAmount: '0',
      creditAmount: '850.0000',
      baseDebitAmount: '0',
      baseCreditAmount: '850.0000',
    },
  ]);

  // ── 7. Sample invoices ──────────────────────────────────────────────────
  console.log('Creating sample invoices...');

  // Invoice 1: Draft
  const inv1Id = uuid();
  await db.insert(invoices).values({
    id: inv1Id,
    tenantId,
    invoiceNumber: 'INV-2026-000001',
    type: 'standard',
    status: 'draft',
    issueDate: '2026-02-15',
    dueDate: '2026-03-17',
    paymentTerms: 'net_30',
    currencyCode: 'USD',
    exchangeRate: '1',
    subtotal: '5000.0000',
    discountAmount: '0',
    taxAmount: '0',
    total: '5000.0000',
    amountPaid: '0',
    balanceDue: '5000.0000',
    notes: 'Draft invoice for consulting services',
    createdBy: adminUserId,
  });

  await db.insert(invoiceLines).values({
    id: uuid(),
    tenantId,
    invoiceId: inv1Id,
    lineNumber: 1,
    description: 'Consulting Services - February 2026',
    quantity: '10.0000',
    unitPrice: '500.0000',
    discountAmount: '0',
    amount: '5000.0000',
    taxAmount: '0',
    accountId: acctId('4020'),
    sortOrder: 0,
  });

  // Invoice 2: Sent, partially paid
  const inv2Id = uuid();
  await db.insert(invoices).values({
    id: inv2Id,
    tenantId,
    invoiceNumber: 'INV-2026-000002',
    type: 'standard',
    status: 'partially_paid',
    issueDate: '2026-02-01',
    dueDate: '2026-03-03',
    paymentTerms: 'net_30',
    currencyCode: 'USD',
    exchangeRate: '1',
    subtotal: '12500.0000',
    discountAmount: '0',
    taxAmount: '0',
    total: '12500.0000',
    amountPaid: '5000.0000',
    balanceDue: '7500.0000',
    journalEntryId: je3Id,
    notes: 'Project Alpha deliverables',
    createdBy: adminUserId,
  });

  await db.insert(invoiceLines).values({
    id: uuid(),
    tenantId,
    invoiceId: inv2Id,
    lineNumber: 1,
    description: 'Project Alpha - Phase 1 Deliverables',
    quantity: '1.0000',
    unitPrice: '12500.0000',
    discountAmount: '0',
    amount: '12500.0000',
    taxAmount: '0',
    accountId: acctId('4010'),
    sortOrder: 0,
  });

  console.log('\n=== Seed completed successfully! ===');
  console.log(`  Tenant:   Demo Company (${tenantId})`);
  console.log(`  Admin:    admin@demo.nexuserp.com / Demo@12345678`);
  console.log(`  Roles:    Admin, Accountant, Viewer`);
  console.log(`  Accounts: ${DEFAULT_CHART_OF_ACCOUNTS.length} chart of accounts entries`);
  console.log(`  JEs:      4 journal entries`);
  console.log(`  Invoices: 2 sample invoices`);

  await client.end();
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

seed().catch((err) => {
  console.error('Seed failed:', err);
  client.end().then(() => process.exit(1));
});
