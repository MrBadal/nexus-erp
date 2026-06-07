import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeaveService } from './leave.service.js';
import { EmployeeService } from '../employee/employee.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto.js';
import { CreateLeaveApplicationDto } from './dto/create-leave-application.dto.js';
import { RejectLeaveDto } from './dto/reject-leave.dto.js';

@ApiTags('hr-leave')
@ApiBearerAuth()
@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // ─── Leave Types ────────────────────────────────────────

  @Get('leave-types')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List leave types' })
  @ApiResponse({ status: 200, description: 'List of leave types' })
  async findAllLeaveTypes(@CurrentTenant() tenantId: string) {
    return this.leaveService.findAllLeaveTypes(tenantId);
  }

  @Post('leave-types')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a new leave type' })
  @ApiResponse({ status: 201, description: 'Leave type created' })
  @ApiResponse({ status: 409, description: 'Leave type code conflict' })
  async createLeaveType(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateLeaveTypeDto,
  ) {
    return this.leaveService.createLeaveType(tenantId, body);
  }

  // ─── Leave Applications ─────────────────────────────────

  @Get('leave-applications')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List leave applications' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of leave applications' })
  async findAllLeaveApplications(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.leaveService.findAllLeaveApplications(tenantId, {
      employeeId,
      status,
      limit,
      offset,
    });
  }

  @Get('leave-applications/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get leave application by ID' })
  @ApiResponse({ status: 200, description: 'Leave application details' })
  @ApiResponse({ status: 404, description: 'Leave application not found' })
  async findLeaveApplicationById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.leaveService.findLeaveApplicationById(tenantId, id);
  }

  @Post('leave-applications')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a new leave application' })
  @ApiResponse({ status: 201, description: 'Leave application created' })
  async createLeaveApplication(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateLeaveApplicationDto,
  ) {
    return this.leaveService.createLeaveApplication(tenantId, body);
  }

  @Put('leave-applications/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Edit a leave application (pending; admin can edit reason on any)' })
  @ApiResponse({ status: 200, description: 'Leave application updated' })
  async updateLeaveApplication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: Partial<{ leaveTypeId: string; fromDate: string; toDate: string; totalDays: number; reason: string }>,
  ) {
    const isAdmin = (user.permissions ?? []).includes('*') || user.roleSlug === 'admin';
    return this.leaveService.updateApplication(tenantId, id, body, isAdmin);
  }

  @Post('leave-applications/:id/cancel')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a leave application (restores allocation/attendance if approved)' })
  @ApiResponse({ status: 200, description: 'Leave application cancelled' })
  async cancelLeaveApplication(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.leaveService.cancelApplication(tenantId, id);
  }

  @Delete('leave-applications/:id')
  @RequirePermissions('hr:delete')
  @ApiOperation({ summary: 'Soft-delete a leave application (admin)' })
  @ApiResponse({ status: 200, description: 'Leave application deleted' })
  async deleteLeaveApplication(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.leaveService.softDeleteApplication(tenantId, id);
  }

  @Post('leave-applications/:id/approve')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a leave application' })
  @ApiResponse({ status: 200, description: 'Leave application approved' })
  async approveLeaveApplication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.leaveService.approveLeaveApplication(tenantId, id, user.sub);
  }

  @Post('leave-applications/:id/reject')
  @RequirePermissions('hr:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a leave application' })
  @ApiResponse({ status: 200, description: 'Leave application rejected' })
  async rejectLeaveApplication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: RejectLeaveDto,
  ) {
    return this.leaveService.rejectLeaveApplication(tenantId, id, user.sub, body.reason);
  }

  // ─── Leave Balance ──────────────────────────────────────

  @Get('leave-balance/:employeeId')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get leave balance for an employee' })
  @ApiResponse({ status: 200, description: 'Leave balance for the employee' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getLeaveBalance(
    @CurrentTenant() tenantId: string,
    @Param('employeeId', UuidValidationPipe) employeeId: string,
  ) {
    return this.leaveService.getLeaveBalance(tenantId, employeeId);
  }
}

// ─── ESS (Employee Self-Service) ─────────────────────────

@ApiTags('ess-leave')
@ApiBearerAuth()
@Controller('ess/leave')
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EssLeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly employeeService: EmployeeService,
  ) {}

  @Get('balance')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'Get my leave balance per leave type' })
  async getMyBalance(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leaveService.getLeaveBalance(tenantId, user.employeeId!);
  }

  @Get('applications')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: 'List my own leave applications' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getMyApplications(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.leaveService.findAllLeaveApplications(tenantId, {
      employeeId: user.employeeId!,
      status,
      limit,
      offset,
    });
  }

  @Post('applications')
  @ScopeToSelf()
  @RequirePermissions('ess:apply_leave')
  @ApiOperation({ summary: 'Submit a new leave application for myself' })
  async createMyApplication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: Omit<CreateLeaveApplicationDto, 'employeeId'>,
  ) {
    return this.leaveService.createLeaveApplication(tenantId, {
      ...body,
      employeeId: user.employeeId!,
    } as CreateLeaveApplicationDto);
  }

  @Post('applications/:id/withdraw')
  @ScopeToSelf()
  @RequirePermissions('ess:apply_leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw my own pending leave application' })
  async withdrawMyApplication(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.leaveService.withdrawMyLeave(tenantId, user.employeeId!, id);
  }

  @Get('team-calendar')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: "Team calendar — colleagues in my department on leave" })
  @ApiQuery({ name: 'month', required: true, description: 'YYYY-MM' })
  async getTeamCalendar(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string,
  ) {
    const departmentId = await this.employeeService.getDepartmentIdOf(
      tenantId,
      user.employeeId!,
    );
    return this.leaveService.getTeamCalendar(
      tenantId,
      user.employeeId!,
      month,
      departmentId,
    );
  }
}
