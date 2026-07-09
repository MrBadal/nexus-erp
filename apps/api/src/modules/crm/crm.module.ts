import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module.js';
import { DealModule } from './deal/deal.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { LeadModule } from './lead/lead.module.js';
import { LeadFinderModule } from './lead-finder/lead-finder.module.js';

@Module({
  imports: [ContactModule, DealModule, ActivityModule, LeadModule, LeadFinderModule],
  exports: [ContactModule, DealModule, ActivityModule, LeadModule, LeadFinderModule],
})
export class CrmModule {}
