import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';

@Module({
  imports: [EventEmitterModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
