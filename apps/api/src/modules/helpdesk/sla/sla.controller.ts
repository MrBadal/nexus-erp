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
import { SlaService } from './sla.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateSlaDto } from './dto/create-sla.dto.js';
import { UpdateSlaDto } from './dto/update-sla.dto.js';

@ApiTags('helpdesk-sla')
@ApiBearerAuth()
@Controller('helpdesk')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get('sla-policies')
  @RequirePermissions('helpdesk:read')
  @ApiOperation({ summary: 'List SLA policies' })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of SLA policies' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('priority') priority?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.slaService.findAll(tenantId, { priority, isActive, limit, offset });
  }

  @Get('sla-policies/:id')
  @RequirePermissions('helpdesk:read')
  @ApiOperation({ summary: 'Get SLA policy by ID' })
  @ApiResponse({ status: 200, description: 'SLA policy details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.slaService.findById(tenantId, id);
  }

  @Post('sla-policies')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Create a new SLA policy' })
  @ApiResponse({ status: 201, description: 'SLA policy created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateSlaDto,
  ) {
    return this.slaService.create(tenantId, body);
  }

  @Put('sla-policies/:id')
  @RequirePermissions('helpdesk:write')
  @ApiOperation({ summary: 'Update an SLA policy' })
  @ApiResponse({ status: 200, description: 'SLA policy updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateSlaDto,
  ) {
    return this.slaService.update(tenantId, id, body);
  }

  @Delete('sla-policies/:id')
  @RequirePermissions('helpdesk:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an SLA policy' })
  @ApiResponse({ status: 204, description: 'SLA policy deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.slaService.softDelete(tenantId, id);
  }
}
