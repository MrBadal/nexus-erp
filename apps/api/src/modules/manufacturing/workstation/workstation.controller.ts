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
import { WorkstationService } from './workstation.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateWorkstationDto } from './dto/create-workstation.dto.js';
import { UpdateWorkstationDto } from './dto/update-workstation.dto.js';

@ApiTags('manufacturing-workstations')
@ApiBearerAuth()
@Controller('manufacturing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkstationController {
  constructor(private readonly workstationService: WorkstationService) {}

  @Get('workstations')
  @RequirePermissions('manufacturing:read')
  @ApiOperation({ summary: 'List all workstations' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of workstations' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    return this.workstationService.findAll(tenantId, { search, isActive: active, limit, offset });
  }

  @Get('workstations/:id')
  @RequirePermissions('manufacturing:read')
  @ApiOperation({ summary: 'Get workstation by ID' })
  @ApiResponse({ status: 200, description: 'Workstation details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.workstationService.findById(tenantId, id);
  }

  @Post('workstations')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Create a new workstation' })
  @ApiResponse({ status: 201, description: 'Workstation created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateWorkstationDto,
  ) {
    return this.workstationService.create(tenantId, body);
  }

  @Put('workstations/:id')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Update a workstation' })
  @ApiResponse({ status: 200, description: 'Workstation updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateWorkstationDto,
  ) {
    return this.workstationService.update(tenantId, id, body);
  }

  @Delete('workstations/:id')
  @RequirePermissions('manufacturing:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a workstation' })
  @ApiResponse({ status: 204, description: 'Workstation deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.workstationService.softDelete(tenantId, id);
  }
}
