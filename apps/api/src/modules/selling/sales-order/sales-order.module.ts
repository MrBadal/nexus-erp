import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SalesOrderController } from './sales-order.controller.js';
import { SalesOrderService } from './sales-order.service.js';

@Module({
  imports: [EventEmitterModule],
  controllers: [SalesOrderController],
  providers: [SalesOrderService],
  exports: [SalesOrderService],
})
export class SalesOrderModule {}
