import { Module } from '@nestjs/common';
import { AccountModule } from './account/account.module.js';
import { JournalEntryModule } from './journal-entry/journal-entry.module.js';
import { InvoiceModule } from './invoice/invoice.module.js';

@Module({
  imports: [AccountModule, JournalEntryModule, InvoiceModule],
  exports: [AccountModule, JournalEntryModule, InvoiceModule],
})
export class FinanceModule {}
