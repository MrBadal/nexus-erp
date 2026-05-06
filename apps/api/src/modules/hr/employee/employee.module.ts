import { Module } from '@nestjs/common';
import { EmployeeController, EssProfileController } from './employee.controller.js';
import { EmployeeService } from './employee.service.js';
import { UserModule } from '../../user/user.module.js';

@Module({
  // Pull in UserModule so EmployeeService can call UserService.create() to
  // create the linked login account when admin invites an employee to the
  // portal.
  imports: [UserModule],
  controllers: [EmployeeController, EssProfileController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
