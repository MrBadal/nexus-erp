import { Module } from '@nestjs/common';
import { LeadController } from './lead.controller.js';
import { LeadService } from './lead.service.js';

@Module({
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}
