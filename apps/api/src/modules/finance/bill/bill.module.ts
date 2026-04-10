import { Module } from '@nestjs/common';
import { BillController } from './bill.controller.js';
import { BillService } from './bill.service.js';
import { TdsModule } from '../tds/tds.module.js';

@Module({
  imports: [TdsModule],
  controllers: [BillController],
  providers: [BillService],
  exports: [BillService],
})
export class BillModule {}
