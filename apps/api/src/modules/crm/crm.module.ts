import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module.js';
import { DealModule } from './deal/deal.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { LeadModule } from './lead/lead.module.js';

@Module({
  imports: [ContactModule, DealModule, ActivityModule, LeadModule],
  exports: [ContactModule, DealModule, ActivityModule, LeadModule],
})
export class CrmModule {}
