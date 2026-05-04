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
import { ShiftService } from './shift.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateShiftDto } from './dto/create-shift.dto.js';
import { UpdateShiftDto } from './dto/update-shift.dto.js';
import { AssignShiftDto } from './dto/assign-shift.dto.js';

@ApiTags('hr-shifts')
@ApiBearerAuth()
@Controller('hr/shifts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get()
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'List shifts' })
  @ApiResponse({ status: 200, description: 'List of shifts' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.shiftService.findAll(tenantId);
  }

  @Get('assignments')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'List shift assignments' })
  @ApiQuery({ name: 'shiftId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  async findAssignments(
    @CurrentTenant() tenantId: string,
    @Query('shiftId') shiftId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.shiftService.findAssignments(tenantId, shiftId, employeeId);
  }

  @Get('active/:employeeId')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Get active shift for an employee on a given date' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD (defaults to today)' })
  async getActiveShift(
    @Param('employeeId', UuidValidationPipe) employeeId: string,
    @Query('date') date?: string,
  ) {
    const checkDate = date ?? new Date().toISOString().split('T')[0];
    return this.shiftService.getActiveShiftForEmployee(employeeId, checkDate);
  }

  @Get(':id')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Get shift by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.shiftService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Create a shift' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateShiftDto,
  ) {
    return this.shiftService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Update a shift' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateShiftDto,
  ) {
    return this.shiftService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('hr:manage_shifts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a shift' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.shiftService.remove(tenantId, id);
  }

  @Post('assignments')
  @RequirePermissions('hr:manage_shifts')
  @ApiOperation({ summary: 'Assign an employee to a shift' })
  async assign(
    @CurrentTenant() tenantId: string,
    @Body() body: AssignShiftDto,
  ) {
    return this.shiftService.assignShift(tenantId, body);
  }

  @Put('assignments/:id/deactivate')
  @RequirePermissions('hr:manage_shifts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set effectiveTo on a shift assignment to deactivate it' })
  async deactivate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { effectiveTo: string },
  ) {
    return this.shiftService.deactivateShift(tenantId, id, body.effectiveTo);
  }
}
