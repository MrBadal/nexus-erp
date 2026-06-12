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
import { ActivityService } from './activity.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';

@ApiTags('crm-activities')
@ApiBearerAuth()
@Controller('crm/activities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @RequirePermissions('activities:read')
  @ApiOperation({ summary: 'List activities with filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'deal_id', required: false })
  @ApiQuery({ name: 'assigned_to', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sort_by', required: false })
  @ApiQuery({ name: 'sort_order', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of activities' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('contact_id') contactId?: string,
    @Query('contactId') contactIdCamel?: string,
    @Query('deal_id') dealId?: string,
    @Query('assigned_to') assignedTo?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return this.activityService.findAll(tenantId, {
      type,
      status,
      priority,
      contactId: contactId || contactIdCamel,
      dealId,
      assignedTo,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @RequirePermissions('activities:read')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiResponse({ status: 200, description: 'Activity details' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.activityService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('activities:write')
  @ApiOperation({ summary: 'Create a new activity' })
  @ApiResponse({ status: 201, description: 'Activity created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateActivityDto,
  ) {
    return this.activityService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('activities:write')
  @ApiOperation({ summary: 'Update activity' })
  @ApiResponse({ status: 200, description: 'Activity updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateActivityDto,
  ) {
    return this.activityService.update(tenantId, id, body);
  }

  @Post(':id/complete')
  @RequirePermissions('activities:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark activity as completed' })
  @ApiResponse({ status: 200, description: 'Activity marked as completed' })
  async complete(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.activityService.complete(tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('activities:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete activity' })
  @ApiResponse({ status: 204, description: 'Activity deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.activityService.softDelete(tenantId, id);
  }
}
