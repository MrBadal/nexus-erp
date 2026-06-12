import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkOrderController } from './work-order.controller.js';
import { WorkOrderService } from './work-order.service.js';

@Module({
  imports: [EventEmitterModule],
  controllers: [WorkOrderController],
  providers: [WorkOrderService],
  exports: [WorkOrderService],
})
export class WorkOrderModule {}
