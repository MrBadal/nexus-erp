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
import {
  LeadService,
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
  LogCallDto,
  Actor,
} from './lead.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

/** Build the acting-user context from the JWT permissions. */
function toActor(user: JwtPayload): Actor {
  const perms = user.permissions ?? [];
  const isAdmin = perms.includes('*') || user.roleSlug === 'admin';
  return {
    userId: user.sub,
    canSeeAll: isAdmin || perms.includes('crm:read_all'),
    canAssign: isAdmin || perms.includes('crm:assign'),
  };
}

@ApiTags('leads')
@ApiBearerAuth()
@Controller('crm/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadController {
  constructor(private readonly service: LeadService) {}

  @Get()
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'List leads (owner-scoped for non-managers)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'mine', required: false, type: Boolean })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'followUpDue', required: false, enum: ['overdue', 'today', 'week'] })
  @ApiQuery({ name: 'sort', required: false, enum: ['recent', 'followup'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('mine') mine?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('followUpDue') followUpDue?: 'overdue' | 'today' | 'week',
    @Query('sort') sort?: 'recent' | 'followup',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(
      tenantId,
      { status, source, priority, search, mine: mine === 'true', assignedTo, followUpDue, sort, limit, offset },
      toActor(user),
    );
  }

  @Get('queue-counts')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Counters for the telecaller work queue' })
  async queueCounts(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.service.queueCounts(tenantId, toActor(user));
  }

  @Get(':id')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get lead by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id, toActor(user));
  }

  @Get(':id/activities')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Call / activity timeline for a lead' })
  async activities(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.getActivities(tenantId, id, toActor(user));
  }

  @Post()
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Create a lead (auto-owned by creator unless assigned)' })
  @ApiResponse({ status: 201, description: 'Lead created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateLeadDto,
  ) {
    return this.service.create(tenantId, body, toActor(user));
  }

  @Put(':id')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Update a lead' })
  async update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateLeadDto,
  ) {
    return this.service.update(tenantId, id, body, toActor(user));
  }

  @Post(':id/log-call')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log a call outcome (disposition) against a lead' })
  async logCall(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: LogCallDto,
  ) {
    return this.service.logCall(tenantId, id, body, toActor(user));
  }

  @Post(':id/assign')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign/claim a lead (managers: any user; reps: claim self)' })
  async assign(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { assignedTo: string | null },
  ) {
    return this.service.assign(tenantId, id, body?.assignedTo ?? null, toActor(user));
  }

  @Post(':id/assign-to-me')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim this lead for yourself' })
  async assignToMe(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.assign(tenantId, id, user.sub, toActor(user));
  }

  @Post(':id/convert')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert lead to contact (and optionally deal)' })
  async convert(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: ConvertLeadDto,
  ) {
    return this.service.convertToContact(tenantId, id, body, toActor(user));
  }

  @Delete(':id')
  @RequirePermissions('crm:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a lead' })
  async remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id, toActor(user));
  }
}
