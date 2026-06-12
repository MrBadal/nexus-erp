import { Module } from '@nestjs/common';
import { ProcedureController } from './procedure.controller.js';
import { ProcedureService } from './procedure.service.js';

@Module({
  controllers: [ProcedureController],
  providers: [ProcedureService],
  exports: [ProcedureService],
})
export class ProcedureModule {}
