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
import { EmployeeExperienceService } from './employee-experience.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateExperienceDto } from './dto/create-experience.dto.js';
import { UpdateExperienceDto } from './dto/update-experience.dto.js';

@ApiTags('hr-employee-experience')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EmployeeExperienceController {
  constructor(private readonly service: EmployeeExperienceService) {}

  // ─── HR-side endpoints ──────────────────────────────────

  @Get('hr/employee-experience')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List employee experience entries (HR)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, description: 'List of experience entries' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findAllForEmployee(tenantId, employeeId);
  }

  @Get('hr/employee-experience/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get a single experience entry (HR)' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post('hr/employee-experience')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create an experience entry (HR)' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateExperienceDto,
  ) {
    return this.service.create(tenantId, body);
  }

  @Put('hr/employee-experience/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update an experience entry (HR)' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateExperienceDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Delete('hr/employee-experience/:id')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an experience entry (HR)' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }

  // ─── ESS-side endpoints ─────────────────────────────────

  @Get('ess/experience')
  @ScopeToSelf()
  @ApiOperation({ summary: 'List my experience entries (ESS)' })
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

  @Post('ess/experience')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Create my experience entry (ESS)' })
  async createMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Body() body: Omit<CreateExperienceDto, 'employeeId'>,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.create(tenantId, { ...body, employeeId });
  }

  @Put('ess/experience/:id')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Update my experience entry (ESS)' })
  async updateMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateExperienceDto,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.updateMine(tenantId, employeeId, id, body);
  }

  @Delete('ess/experience/:id')
  @ScopeToSelf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my experience entry (ESS)' })
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
