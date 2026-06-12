import { Module } from '@nestjs/common';
import { EmployeeModule } from './employee/employee.module.js';
import { LeaveModule } from './leave/leave.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { ExpenseClaimModule } from './expense-claim/expense-claim.module.js';
import { RecruitmentModule } from './recruitment/recruitment.module.js';

@Module({
  imports: [EmployeeModule, LeaveModule, PayrollModule, AttendanceModule, ExpenseClaimModule, RecruitmentModule],
  exports: [EmployeeModule, LeaveModule, PayrollModule, AttendanceModule, ExpenseClaimModule, RecruitmentModule],
})
export class HrModule {}
