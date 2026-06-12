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
import { LeadService, CreateLeadDto, UpdateLeadDto, ConvertLeadDto } from './lead.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('crm/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadController {
  constructor(private readonly service: LeadService) {}

  @Get()
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'List leads' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, { status, source, search, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('crm:read')
  @ApiOperation({ summary: 'Get lead by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Create a lead' })
  @ApiResponse({ status: 201, description: 'Lead created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateLeadDto,
  ) {
    return this.service.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('crm:write')
  @ApiOperation({ summary: 'Update a lead' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateLeadDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Post(':id/convert')
  @RequirePermissions('crm:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert lead to contact (and optionally deal)' })
  async convert(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: ConvertLeadDto,
  ) {
    return this.service.convertToContact(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('crm:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a lead' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }
}
