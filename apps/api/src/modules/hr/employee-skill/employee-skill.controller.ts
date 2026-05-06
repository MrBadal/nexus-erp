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
import { EmployeeSkillService } from './employee-skill.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';
import { UpdateSkillDto } from './dto/update-skill.dto.js';

@ApiTags('hr-employee-skills')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class EmployeeSkillController {
  constructor(private readonly service: EmployeeSkillService) {}

  // ─── HR-side endpoints ──────────────────────────────────

  @Get('hr/employee-skills')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'List employee skill / certification entries (HR)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, description: 'List of skills' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findAllForEmployee(tenantId, employeeId);
  }

  @Get('hr/employee-skills/:id')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Get a single skill entry (HR)' })
  async findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post('hr/employee-skills')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Create a skill / certification entry (HR)' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateSkillDto,
  ) {
    return this.service.create(tenantId, body);
  }

  @Put('hr/employee-skills/:id')
  @RequirePermissions('hr:write')
  @ApiOperation({ summary: 'Update a skill entry (HR)' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateSkillDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Delete('hr/employee-skills/:id')
  @RequirePermissions('hr:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a skill entry (HR)' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }

  // ─── ESS-side endpoints ─────────────────────────────────

  @Get('ess/skills')
  @ScopeToSelf()
  @ApiOperation({ summary: 'List my skills / certifications (ESS)' })
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

  @Post('ess/skills')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Create my skill entry (ESS)' })
  async createMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Body() body: Omit<CreateSkillDto, 'employeeId'>,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.create(tenantId, { ...body, employeeId });
  }

  @Put('ess/skills/:id')
  @ScopeToSelf()
  @ApiOperation({ summary: 'Update my skill entry (ESS)' })
  async updateMine(
    @CurrentTenant() tenantId: string,
    @Req() req: Request & { scopedEmployeeId?: string },
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateSkillDto,
  ) {
    const employeeId = req.scopedEmployeeId;
    if (!employeeId) {
      throw new NotFoundException('Employee context not found');
    }
    return this.service.updateMine(tenantId, employeeId, id, body);
  }

  @Delete('ess/skills/:id')
  @ScopeToSelf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my skill entry (ESS)' })
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
