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
import { AttendanceService } from './attendance.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { CheckOutDto } from './dto/check-out.dto.js';
import { ManualAttendanceDto, UpdateAttendanceDto } from './dto/manual-attendance.dto.js';

@ApiTags('hr-attendance')
@ApiBearerAuth()
@Controller('hr/attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List attendance records' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of attendance records' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.attendanceService.findAll(tenantId, {
      employeeId,
      fromDate,
      toDate,
      status,
      limit,
      offset,
    });
  }

  @Post('check-in')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record employee check-in' })
  @ApiResponse({ status: 200, description: 'Check-in recorded' })
  async checkIn(
    @CurrentTenant() tenantId: string,
    @Body() body: CheckInDto,
  ) {
    return this.attendanceService.checkIn(tenantId, body);
  }

  @Post('check-out')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record employee check-out' })
  @ApiResponse({ status: 200, description: 'Check-out recorded' })
  async checkOut(
    @CurrentTenant() tenantId: string,
    @Body() body: CheckOutDto,
  ) {
    return this.attendanceService.checkOut(tenantId, body);
  }

  @Post('manual')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Manually create an attendance record (HR/admin)' })
  @ApiResponse({ status: 201, description: 'Attendance record created' })
  async manualCreate(
    @CurrentTenant() tenantId: string,
    @Body() body: ManualAttendanceDto,
  ) {
    return this.attendanceService.manualCreate(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Correct an attendance record (HR/admin)' })
  @ApiResponse({ status: 200, description: 'Attendance record updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('hr:delete')
  @ApiOperation({ summary: 'Soft-delete an attendance record (HR/admin)' })
  @ApiResponse({ status: 200, description: 'Attendance record deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.attendanceService.softDelete(tenantId, id);
  }

  @Get('summary/:employeeId')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get attendance summary for an employee' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiResponse({ status: 200, description: 'Attendance summary' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getAttendanceSummary(
    @CurrentTenant() tenantId: string,
    @Param('employeeId', UuidValidationPipe) employeeId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.attendanceService.getAttendanceSummary(tenantId, employeeId, {
      fromDate,
      toDate,
    });
  }
}

// ─── ESS (Employee Self-Service) ─────────────────────────

@ApiTags('ess-attendance')
@ApiBearerAuth()
@Controller('ess/attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EssAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiOperation({ summary: "Get today's attendance record for the current user" })
  async getToday(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attendanceService.getTodayForEmployee(tenantId, user.employeeId!);
  }

  @Get('me')
  @ScopeToSelf()
  @RequirePermissions('ess:read')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Get my attendance history' })
  async getMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.findMine(tenantId, user.employeeId!, { from, to });
  }

  @Post('check-in')
  @ScopeToSelf()
  @RequirePermissions('ess:check_in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check myself in for today' })
  async checkIn(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { notes?: string } = {},
  ) {
    return this.attendanceService.checkIn(tenantId, {
      employeeId: user.employeeId!,
      notes: body?.notes,
    });
  }

  @Post('check-out')
  @ScopeToSelf()
  @RequirePermissions('ess:check_in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check myself out for today' })
  async checkOut(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { notes?: string } = {},
  ) {
    return this.attendanceService.checkOut(tenantId, {
      employeeId: user.employeeId!,
      notes: body?.notes,
    });
  }
}
