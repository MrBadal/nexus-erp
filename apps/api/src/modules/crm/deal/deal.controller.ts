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
import { DealService } from './deal.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateDealDto } from './dto/create-deal.dto.js';
import { UpdateDealDto } from './dto/update-deal.dto.js';
import { UpdateDealStageDto } from './dto/update-deal-stage.dto.js';
import { CreateDealStageDto } from './dto/create-deal-stage.dto.js';

@ApiTags('crm-deals')
@ApiBearerAuth()
@Controller('crm/deals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Get('pipeline-summary')
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'Get pipeline summary grouped by stage with totals' })
  @ApiResponse({ status: 200, description: 'Pipeline summary data' })
  async getPipelineSummary(@CurrentTenant() tenantId: string) {
    return this.dealService.getPipelineSummary(tenantId);
  }

  @Get()
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'List deals with filters' })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'assigned_to', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sort_by', required: false })
  @ApiQuery({ name: 'sort_order', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of deals' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('stage') stage?: string,
    @Query('contact_id') contactId?: string,
    @Query('contactId') contactIdCamel?: string,
    @Query('assigned_to') assignedTo?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ) {
    return this.dealService.findAll(tenantId, {
      stage,
      contactId: contactId || contactIdCamel,
      assignedTo,
      search,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'Get deal by ID' })
  @ApiResponse({ status: 200, description: 'Deal details with contact' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.dealService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('deals:write')
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({ status: 201, description: 'Deal created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateDealDto,
  ) {
    return this.dealService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('deals:write')
  @ApiOperation({ summary: 'Update deal' })
  @ApiResponse({ status: 200, description: 'Deal updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateDealDto,
  ) {
    return this.dealService.update(tenantId, id, body);
  }

  @Put(':id/stage')
  @RequirePermissions('deals:write')
  @ApiOperation({ summary: 'Update deal stage' })
  @ApiResponse({ status: 200, description: 'Deal stage updated' })
  async updateStage(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateDealStageDto,
  ) {
    return this.dealService.updateStage(tenantId, id, body);
  }

  @Post(':id/convert-to-quotation')
  @RequirePermissions('deals:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert a deal into a draft quotation' })
  @ApiResponse({ status: 200, description: 'Quotation created from deal' })
  async convertToQuotation(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { customerId: string; validUntil: string; currency?: string; notes?: string },
  ) {
    return this.dealService.convertToQuotation(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('deals:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete deal' })
  @ApiResponse({ status: 204, description: 'Deal deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.dealService.softDelete(tenantId, id);
  }
}

@ApiTags('crm-deal-stages')
@ApiBearerAuth()
@Controller('crm/deal-stages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DealStageController {
  constructor(private readonly dealService: DealService) {}

  @Get()
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'List all deal stages' })
  @ApiResponse({ status: 200, description: 'List of deal stages' })
  async findAllStages(@CurrentTenant() tenantId: string) {
    return this.dealService.findAllStages(tenantId);
  }

  @Post()
  @RequirePermissions('deals:write')
  @ApiOperation({ summary: 'Create a deal stage' })
  @ApiResponse({ status: 201, description: 'Deal stage created' })
  async createStage(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateDealStageDto,
  ) {
    return this.dealService.createStage(tenantId, body);
  }
}
