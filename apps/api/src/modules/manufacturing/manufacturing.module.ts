import { Module } from '@nestjs/common';
import { BomModule } from './bom/bom.module.js';
import { WorkOrderModule } from './work-order/work-order.module.js';
import { WorkstationModule } from './workstation/workstation.module.js';

@Module({
  imports: [BomModule, WorkOrderModule, WorkstationModule],
  exports: [BomModule, WorkOrderModule, WorkstationModule],
})
export class ManufacturingModule {}
