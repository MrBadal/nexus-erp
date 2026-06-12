import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DeliveryNoteController } from './delivery-note.controller.js';
import { DeliveryNoteService } from './delivery-note.service.js';

@Module({
  imports: [EventEmitterModule],
  controllers: [DeliveryNoteController],
  providers: [DeliveryNoteService],
  exports: [DeliveryNoteService],
})
export class DeliveryNoteModule {}
