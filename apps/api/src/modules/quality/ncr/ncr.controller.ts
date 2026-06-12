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
import { NcrService } from './ncr.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateNcrDto } from './dto/create-ncr.dto.js';
import { UpdateNcrDto } from './dto/update-ncr.dto.js';

@ApiTags('quality-ncr')
@ApiBearerAuth()
@Controller('quality')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NcrController {
  constructor(private readonly ncrService: NcrService) {}

  @Get('ncr')
  @RequirePermissions('quality:read')
  @ApiOperation({ summary: 'List non-conformance reports with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of non-conformance reports' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.ncrService.findAll(tenantId, { status, severity, search, limit, offset });
  }

  @Get('ncr/:id')
  @RequirePermissions('quality:read')
  @ApiOperation({ summary: 'Get NCR by ID' })
  @ApiResponse({ status: 200, description: 'NCR details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ncrService.findById(tenantId, id);
  }

  @Post('ncr')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Create a new non-conformance report' })
  @ApiResponse({ status: 201, description: 'NCR created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateNcrDto,
  ) {
    return this.ncrService.create(tenantId, body);
  }

  @Put('ncr/:id')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Update an NCR' })
  @ApiResponse({ status: 200, description: 'NCR updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateNcrDto,
  ) {
    return this.ncrService.update(tenantId, id, body);
  }

  @Post('ncr/:id/investigate')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Move NCR to investigation' })
  @ApiResponse({ status: 200, description: 'NCR moved to investigation' })
  async investigate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ncrService.updateStatus(tenantId, id, 'investigation');
  }

  @Post('ncr/:id/corrective-action')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Move NCR to corrective action' })
  @ApiResponse({ status: 200, description: 'NCR moved to corrective action' })
  async correctiveAction(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ncrService.updateStatus(tenantId, id, 'corrective_action');
  }

  @Post('ncr/:id/close')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Close an NCR' })
  @ApiResponse({ status: 200, description: 'NCR closed' })
  async close(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ncrService.updateStatus(tenantId, id, 'closed');
  }

  @Post('ncr/:id/void')
  @RequirePermissions('quality:write')
  @ApiOperation({ summary: 'Void an NCR' })
  @ApiResponse({ status: 200, description: 'NCR voided' })
  async void_(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ncrService.updateStatus(tenantId, id, 'void');
  }

  @Delete('ncr/:id')
  @RequirePermissions('quality:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an NCR' })
  @ApiResponse({ status: 204, description: 'NCR deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.ncrService.softDelete(tenantId, id);
  }
}
