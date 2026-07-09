import { Module } from '@nestjs/common';
import { LeadFinderController } from './lead-finder.controller.js';
import { LeadFinderService } from './lead-finder.service.js';

@Module({
  controllers: [LeadFinderController],
  providers: [LeadFinderService],
  exports: [LeadFinderService],
})
export class LeadFinderModule {}
