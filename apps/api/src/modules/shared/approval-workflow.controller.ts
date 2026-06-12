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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  ApprovalWorkflowService,
  CreateWorkflowDto,
  UpdateWorkflowDto,
} from './approval-workflow.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe.js';

@ApiTags('approval-workflows')
@ApiBearerAuth()
@Controller('settings/approval-workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApprovalWorkflowController {
  constructor(private readonly service: ApprovalWorkflowService) {}

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List approval workflows' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAllWorkflows(tenantId);
  }

  @Get(':id')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get workflow by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findWorkflowById(tenantId, id);
  }

  @Post()
  @RequirePermissions('settings:write')
  @ApiOperation({ summary: 'Create approval workflow' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateWorkflowDto,
  ) {
    return this.service.createWorkflow(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('settings:write')
  @ApiOperation({ summary: 'Update approval workflow' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateWorkflowDto,
  ) {
    return this.service.updateWorkflow(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('settings:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete approval workflow' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDeleteWorkflow(tenantId, id);
  }

  // ─── Approval Requests ────────────────────────────────

  @Get('requests/pending')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List pending approval requests' })
  async findPending(
    @CurrentTenant() tenantId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.findPendingRequests(tenantId, req.user.id);
  }

  @Post('requests/:id/approve')
  @RequirePermissions('settings:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an approval request' })
  async approve(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: { user: { id: string } },
    @Body() body: { comments?: string },
  ) {
    return this.service.approveRequest(tenantId, id, req.user.id, body?.comments);
  }

  @Post('requests/:id/reject')
  @RequirePermissions('settings:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an approval request' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Request() req: { user: { id: string } },
    @Body() body: { comments?: string },
  ) {
    return this.service.rejectRequest(tenantId, id, req.user.id, body?.comments);
  }
}
