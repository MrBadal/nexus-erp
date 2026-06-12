import { Module } from '@nestjs/common';
import { EmployeeDocumentController } from './employee-document.controller.js';
import { EmployeeDocumentService } from './employee-document.service.js';
import { FilesModule } from '../../files/files.module.js';

@Module({
  imports: [FilesModule],
  controllers: [EmployeeDocumentController],
  providers: [EmployeeDocumentService],
  exports: [EmployeeDocumentService],
})
export class EmployeeDocumentModule {}
