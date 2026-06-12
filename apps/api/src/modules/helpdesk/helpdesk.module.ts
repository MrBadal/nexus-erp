import { Module } from '@nestjs/common';
import { TicketModule } from './ticket/ticket.module.js';
import { SlaModule } from './sla/sla.module.js';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module.js';

@Module({
  imports: [TicketModule, SlaModule, KnowledgeBaseModule],
  exports: [TicketModule, SlaModule, KnowledgeBaseModule],
})
export class HelpdeskModule {}
