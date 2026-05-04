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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OffboardingTemplateService } from './offboarding-template.service.js';
import { OffboardingChecklistService } from './offboarding-checklist.service.js';
import {
  CreateOffboardingTemplateDto,
  UpdateOffboardingTemplateDto,
  CreateOffboardingChecklistFromTemplateDto,
  UpdateOffboardingTaskStatusDto,
} from './dto/offboarding.dto.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('hr-offboarding')
@ApiBearerAuth()
@Controller('hr/offboarding')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OffboardingController {
  constructor(
    private readonly templateService: OffboardingTemplateService,
    private readonly checklistService: OffboardingChecklistService,
  ) {}

  // ─── Templates ──────────────────────────────────────────

  @Get('templates')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'List offboarding templates' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'designationId', required: false })
  async listTemplates(
    @CurrentTenant() tenantId: string,
    @Query('isActive') isActive?: string,
    @Query('designationId') designationId?: string,
  ) {
    return this.templateService.findAll(tenantId, {
      isActive: isActive === undefined ? undefined : isActive === 'true',
      designationId,
    });
  }

  @Get('templates/:id')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'Get offboarding template with tasks' })
  async getTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.templateService.findById(tenantId, id);
  }

  @Post('templates')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'Create offboarding template' })
  async createTemplate(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateOffboardingTemplateDto,
  ) {
    return this.templateService.create(tenantId, body);
  }

  @Put('templates/:id')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'Update offboarding template' })
  async updateTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateOffboardingTemplateDto,
  ) {
    return this.templateService.update(tenantId, id, body);
  }

  @Delete('templates/:id')
  @RequirePermissions('hr:manage_onboarding')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete offboarding template' })
  async deleteTemplate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.templateService.softDelete(tenantId, id);
  }

  // ─── Checklists ─────────────────────────────────────────

  @Get('checklists')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'List offboarding checklists' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  async listChecklists(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.checklistService.findAll(tenantId, {
      status: status as 'pending' | 'in_progress' | 'completed' | 'overdue' | undefined,
      employeeId,
    });
  }

  @Get('checklists/kanban')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'Offboarding checklists grouped by status (kanban view)' })
  async kanban(@CurrentTenant() tenantId: string) {
    return this.checklistService.kanbanByStatus(tenantId);
  }

  @Get('checklists/my-tasks')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'Get pending offboarding tasks assigned to current user' })
  async myTasks(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.checklistService.getPendingTasksFor(tenantId, user.sub);
  }

  @Get('checklists/:id')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'Get offboarding checklist with tasks' })
  async getChecklist(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.checklistService.findById(tenantId, id);
  }

  @Post('checklists')
  @RequirePermissions('hr:manage_onboarding')
  @ApiOperation({ summary: 'Create offboarding checklist for an employee from a template' })
  async createChecklist(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateOffboardingChecklistFromTemplateDto,
  ) {
    return this.checklistService.createFromTemplate(
      tenantId,
      body.employeeId,
      body.templateId,
    );
  }

  @Put('tasks/:id/status')
  @RequirePermissions('hr:manage_onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an offboarding task status' })
  async updateTaskStatus(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateOffboardingTaskStatusDto,
  ) {
    return this.checklistService.updateTaskStatus(tenantId, id, user.sub, body);
  }
}
