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
import { TaskService } from './task.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@ApiTags('projects-tasks')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('tasks')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'List tasks with filters' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.taskService.findAll(tenantId, { projectId, status, priority, assignedTo, search, limit, offset });
  }

  @Get('tasks/:id')
  @RequirePermissions('projects:read')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.taskService.findById(tenantId, id);
  }

  @Post('tasks')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateTaskDto,
  ) {
    return this.taskService.create(tenantId, body);
  }

  @Put('tasks/:id')
  @RequirePermissions('projects:write')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.taskService.update(tenantId, id, body);
  }

  @Delete('tasks/:id')
  @RequirePermissions('projects:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a task' })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.taskService.softDelete(tenantId, id);
  }
}
