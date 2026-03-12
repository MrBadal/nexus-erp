import { Module } from '@nestjs/common';
import { JournalEntryController } from './journal-entry.controller.js';
import { JournalEntryService } from './journal-entry.service.js';

@Module({
  controllers: [JournalEntryController],
  providers: [JournalEntryService],
  exports: [JournalEntryService],
})
export class JournalEntryModule {}
