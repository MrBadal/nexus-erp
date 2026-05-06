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
import { EmployeeFamilyService } from './employee-family.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateFamilyDto } from './dto/create-family.dto.js';
import { UpdateFamilyDto } from './dto/update-family.dto.js';

@ApiTags('hr-employee-family')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EmployeeFamilyController {
  constructor(private readonly service: EmployeeFamilyService) {}

  // ─── HR-side endpoints ──────────────────────────────────

  @Get('hr/employee-family')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List employee family/nominee entries (HR)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, description: 'List of family entries' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findAllForEmployee(tenantId, employeeId);
  }

  @Get('hr/employee-family/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get a single family entry (HR)' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post('hr/employee-family')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a family/nominee entry (HR)' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateFamilyDto,
  ) {
    return this.service.create(tenantId, body);
  }

  @Put('hr/employee-family/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update a family entry (HR)' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateFamilyDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Delete('hr/employee-family/:id')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a family entry (HR)' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }

  // ─── ESS-side endpoints ─────────────────────────────────

  @Get('ess/family')
  @ScopeToSelf()
  @ApiOperation({ summary: 'List my family / nominee entries (ESS)' })
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

  @Post('ess/family')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Create my family entry (ESS)' })
  async createMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Body() body: Omit<CreateFamilyDto, 'employeeId'>,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.create(tenantId, { ...body, employeeId });
  }

  @Put('ess/family/:id')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Update my family entry (ESS)' })
  async updateMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateFamilyDto,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.updateMine(tenantId, employeeId, id, body);
  }

  @Delete('ess/family/:id')
  @ScopeToSelf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my family entry (ESS)' })
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
