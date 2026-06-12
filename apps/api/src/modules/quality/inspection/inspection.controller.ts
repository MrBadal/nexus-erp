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
import { InspectionService } from './inspection.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateInspectionDto } from './dto/create-inspection.dto.js';
import { UpdateInspectionDto } from './dto/update-inspection.dto.js';

@ApiTags('quality-inspections')
@ApiBearerAuth()
@Controller('quality')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  @Get('inspections')
  @RequirePermissions('quality:read')
  @ApiOperation({ summary: 'List quality inspections with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'referenceType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of quality inspections' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('referenceType') referenceType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.inspectionService.findAll(tenantId, { status, referenceType, search, limit, offset });
  }

  @Get('inspections/:id')
  @RequirePermissions('quality:read')
  @ApiOperation({ summary: 'Get inspection by ID with readings' })
  @ApiResponse({ status: 200, description: 'Inspection details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.inspectionService.findById(tenantId, id);
  }

  @Post('inspections')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Create a new quality inspection' })
  @ApiResponse({ status: 201, description: 'Inspection created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateInspectionDto,
  ) {
    return this.inspectionService.create(tenantId, body);
  }

  @Put('inspections/:id')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Update an inspection' })
  @ApiResponse({ status: 200, description: 'Inspection updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateInspectionDto,
  ) {
    return this.inspectionService.update(tenantId, id, body);
  }

  @Post('inspections/:id/accept')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Accept an inspection' })
  @ApiResponse({ status: 200, description: 'Inspection accepted' })
  async accept(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.inspectionService.updateStatus(tenantId, id, 'accepted');
  }

  @Post('inspections/:id/reject')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Reject an inspection' })
  @ApiResponse({ status: 200, description: 'Inspection rejected' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.inspectionService.updateStatus(tenantId, id, 'rejected');
  }

  @Post('inspections/:id/hold')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Put inspection on hold' })
  @ApiResponse({ status: 200, description: 'Inspection on hold' })
  async hold(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.inspectionService.updateStatus(tenantId, id, 'on_hold');
  }

  @Delete('inspections/:id')
  @RequirePermissions('quality:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an inspection' })
  @ApiResponse({ status: 204, description: 'Inspection deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.inspectionService.softDelete(tenantId, id);
  }
}
