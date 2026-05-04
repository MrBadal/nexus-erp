import { Module } from '@nestjs/common';
import { EmployeeDocumentController } from './employee-document.controller.js';
import { EmployeeDocumentService } from './employee-document.service.js';

@Module({
  controllers: [EmployeeDocumentController],
  providers: [EmployeeDocumentService],
  exports: [EmployeeDocumentService],
})
export class EmployeeDocumentModule {}
