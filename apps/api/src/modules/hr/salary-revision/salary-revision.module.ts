import { Module } from '@nestjs/common';
import { SalaryRevisionController } from './salary-revision.controller.js';
import { SalaryRevisionService } from './salary-revision.service.js';

@Module({
  controllers: [SalaryRevisionController],
  providers: [SalaryRevisionService],
  exports: [SalaryRevisionService],
})
export class SalaryRevisionModule {}
