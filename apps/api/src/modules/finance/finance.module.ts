import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module.js';
import { JournalEntryModule } from './journal-entry/journal-entry.module.js';
import { InvoiceModule } from './invoice/invoice.module.js';
import { PaymentModule } from './payment/payment.module.js';
import { ReportModule } from './report/report.module.js';
import { BillModule } from './bill/bill.module.js';
import { BankReconciliationModule } from './bank-reconciliation/bank-reconciliation.module.js';
import { CurrencyModule } from './currency/currency.module.js';
import { FiscalPeriodModule } from './fiscal-period/fiscal-period.module.js';
import { TaxModule } from './tax/tax.module.js';
import { BudgetModule } from './budget/budget.module.js';
import { TdsModule } from './tds/tds.module.js';

@Module({
  imports: [AccountModule, JournalEntryModule, InvoiceModule, PaymentModule, ReportModule, BillModule, BankReconciliationModule, CurrencyModule, FiscalPeriodModule, TaxModule, BudgetModule, TdsModule],
  exports: [AccountModule, JournalEntryModule, InvoiceModule, PaymentModule, ReportModule, BillModule, BankReconciliationModule, CurrencyModule, FiscalPeriodModule, TaxModule, BudgetModule, TdsModule],
})
export class FinanceModule {}
