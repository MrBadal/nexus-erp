import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { EmployeeEducationService } from './employee-education.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateEducationDto } from './dto/create-education.dto.js';
import { UpdateEducationDto } from './dto/update-education.dto.js';

@ApiTags('hr-employee-education')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EmployeeEducationController {
  constructor(private readonly service: EmployeeEducationService) {}

  // ─── HR-side endpoints ──────────────────────────────────

  @Get('hr/employee-education')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List employee education entries (HR)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, description: 'List of education entries' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findAllForEmployee(tenantId, employeeId);
  }

  @Get('hr/employee-education/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get a single education entry (HR)' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post('hr/employee-education')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create an education entry (HR)' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateEducationDto,
  ) {
    return this.service.create(tenantId, body);
  }

  @Put('hr/employee-education/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update an education entry (HR)' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateEducationDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Delete('hr/employee-education/:id')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an education entry (HR)' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }

  // ─── ESS-side endpoints ─────────────────────────────────

  @Get('ess/education')
  @ScopeToSelf()
  @ApiOperation({ summary: 'List my education entries (ESS)' })
  async findMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.findMine(tenantId, employeeId);
  }

  @Post('ess/education')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Create my education entry (ESS)' })
  async createMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Body() body: Omit<CreateEducationDto, 'employeeId'>,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.create(tenantId, { ...body, employeeId });
  }

  @Put('ess/education/:id')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Update my education entry (ESS)' })
  async updateMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateEducationDto,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.updateMine(tenantId, employeeId, id, body);
  }

  @Delete('ess/education/:id')
  @ScopeToSelf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my education entry (ESS)' })
  async deleteMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.deleteMine(tenantId, employeeId, id);
  }
}
