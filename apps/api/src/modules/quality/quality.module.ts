import { Module } from '@nestjs/common';
import { InspectionModule } from './inspection/inspection.module.js';
import { ProcedureModule } from './procedure/procedure.module.js';
import { NcrModule } from './ncr/ncr.module.js';

@Module({
  imports: [InspectionModule, ProcedureModule, NcrModule],
  exports: [InspectionModule, ProcedureModule, NcrModule],
})
export class QualityModule {}
