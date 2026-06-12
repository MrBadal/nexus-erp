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
import { BomService } from './bom.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';
import { CreateBomDto } from './dto/create-bom.dto.js';
import { UpdateBomDto } from './dto/update-bom.dto.js';

@ApiTags('manufacturing-bom')
@ApiBearerAuth()
@Controller('manufacturing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Get('bom')
  @RequirePermissions('manufacturing:read')
  @ApiOperation({ summary: 'List all BOMs with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of BOMs' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.bomService.findAll(tenantId, { status, search, limit, offset });
  }

  @Get('bom/:id')
  @RequirePermissions('manufacturing:read')
  @ApiOperation({ summary: 'Get BOM by ID with items' })
  @ApiResponse({ status: 200, description: 'BOM details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.bomService.findById(tenantId, id);
  }

  @Post('bom')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Create a new BOM' })
  @ApiResponse({ status: 201, description: 'BOM created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: CreateBomDto,
  ) {
    return this.bomService.create(tenantId, body);
  }

  @Put('bom/:id')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Update a BOM' })
  @ApiResponse({ status: 200, description: 'BOM updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateBomDto,
  ) {
    return this.bomService.update(tenantId, id, body);
  }

  @Post('bom/:id/activate')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Activate a BOM' })
  @ApiResponse({ status: 200, description: 'BOM activated' })
  async activate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.bomService.updateStatus(tenantId, id, 'active');
  }

  @Post('bom/:id/deactivate')
  @RequirePermissions('manufacturing:write')
  @ApiOperation({ summary: 'Deactivate a BOM' })
  @ApiResponse({ status: 200, description: 'BOM deactivated' })
  async deactivate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.bomService.updateStatus(tenantId, id, 'inactive');
  }

  @Delete('bom/:id')
  @RequirePermissions('manufacturing:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a BOM' })
  @ApiResponse({ status: 204, description: 'BOM deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.bomService.softDelete(tenantId, id);
  }
}
