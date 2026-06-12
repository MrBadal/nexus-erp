import { Module } from '@nestjs/common';
import { RaBillController } from './ra-bill.controller.js';
import { RaBillService } from './ra-bill.service.js';

@Module({
  controllers: [RaBillController],
  providers: [RaBillService],
  exports: [RaBillService],
})
export class RaBillModule {}
