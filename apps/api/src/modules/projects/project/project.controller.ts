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
import { ProjectService } from './project.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'List projects with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.projectService.findAll(tenantId, { status, priority, search, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'Get project by ID with tasks' })
  @ApiResponse({ status: 200, description: 'Project details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.projectService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateProjectDto,
  ) {
    return this.projectService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Project updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projectService.update(tenantId, id, body);
  }

  @Post(':id/activate')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Activate a planning project' })
  @ApiResponse({ status: 200, description: 'Project activated' })
  async activate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.projectService.updateStatus(tenantId, id, 'active');
  }

  @Post(':id/hold')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Put project on hold' })
  @ApiResponse({ status: 200, description: 'Project put on hold' })
  async hold(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.projectService.updateStatus(tenantId, id, 'on_hold');
  }

  @Post(':id/complete')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Complete a project' })
  @ApiResponse({ status: 200, description: 'Project completed' })
  async complete(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.projectService.updateStatus(tenantId, id, 'completed');
  }

  @Post(':id/cancel')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Cancel a project' })
  @ApiResponse({ status: 200, description: 'Project cancelled' })
  async cancel(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.projectService.updateStatus(tenantId, id, 'cancelled');
  }

  @Delete(':id')
  @RequirePermissions('projects:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a project' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.projectService.softDelete(tenantId, id);
  }
}
