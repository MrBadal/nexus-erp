import { Module } from '@nestjs/common';
import { PayrollController, EssPayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';
import { PayslipPdfService } from './payslip-pdf.service.js';

@Module({
  controllers: [PayrollController, EssPayrollController],
  providers: [PayrollService, PayslipPdfService],
  exports: [PayrollService, PayslipPdfService],
})
export class PayrollModule {}
