import { Module } from '@nestjs/common';
import { ContractModule } from './contract/contract.module.js';
import { RaBillModule } from './ra-bill/ra-bill.module.js';
import { WorkOrderModule } from './work-order/work-order.module.js';
import { SiteGrnModule } from './site-grn/site-grn.module.js';
import { MeasurementBookModule } from './measurement-book/measurement-book.module.js';
import { DprModule } from './dpr/dpr.module.js';
import { SiteMaterialIssueModule } from './site-material-issue/site-material-issue.module.js';

@Module({
  imports: [ContractModule, RaBillModule, WorkOrderModule, SiteGrnModule, MeasurementBookModule, DprModule, SiteMaterialIssueModule],
  exports: [ContractModule, RaBillModule, WorkOrderModule, SiteGrnModule, MeasurementBookModule, DprModule, SiteMaterialIssueModule],
})
export class ConstructionModule {}
