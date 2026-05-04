import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendancePolicyService } from './attendance-policy.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateAttendancePolicyDto } from './dto/create-attendance-policy.dto.js';
import { UpdateAttendancePolicyDto } from './dto/update-attendance-policy.dto.js';

@ApiTags('hr-attendance-policies')
@ApiBearerAuth()
@Controller('hr/attendance-policies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendancePolicyController {
  constructor(private readonly policyService: AttendancePolicyService) {}

  @Get()
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'List attendance policies' })
  @ApiResponse({ status: 200, description: 'List of attendance policies' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.policyService.findAll(tenantId);
  }

  @Get('active')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Get the currently active attendance policy' })
  async findActive(@CurrentTenant() tenantId: string) {
    return this.policyService.findActive(tenantId);
  }

  @Get('compute-deductions/:employeeId')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Compute late deductions for an employee for a month' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number, description: '1-12' })
  async computeDeductions(
    @CurrentTenant() tenantId: string,
    @Param('employeeId', UuidValidationPipe) employeeId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.policyService.computeLateDeductionsForMonth(tenantId, employeeId, year, month);
  }

  @Get(':id')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Get an attendance policy by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.policyService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Create an attendance policy' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateAttendancePolicyDto,
  ) {
    return this.policyService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Update an attendance policy' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateAttendancePolicyDto,
  ) {
    return this.policyService.update(tenantId, id, body);
  }
}
