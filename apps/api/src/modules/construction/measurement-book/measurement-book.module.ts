import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { MeasurementBookService } from './measurement-book.service.js';
import { MeasurementBookController } from './measurement-book.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [MeasurementBookController],
  providers: [MeasurementBookService],
  exports: [MeasurementBookService],
})
export class MeasurementBookModule {}
