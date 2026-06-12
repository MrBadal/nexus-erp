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
import { MaterialRequestService, CreateMaterialRequestDto, UpdateMaterialRequestDto } from './material-request.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('material-requests')
@ApiBearerAuth()
@Controller('buying/material-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialRequestController {
  constructor(private readonly service: MaterialRequestService) {}

  @Get()
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'List material requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'requestType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('requestType') requestType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.findAll(tenantId, { status, requestType, search, limit, offset });
  }

  @Get(':id')
  @RequirePermissions('buying:read')
  @ApiOperation({ summary: 'Get material request by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Create a material request' })
  @ApiResponse({ status: 201, description: 'Material request created' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Body() body: CreateMaterialRequestDto,
  ) {
    return this.service.create(tenantId, user.userId, body);
  }

  @Put(':id')
  @RequirePermissions('buying:write')
  @ApiOperation({ summary: 'Update a material request' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: UpdateMaterialRequestDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Post(':id/submit')
  @RequirePermissions('buying:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a material request for approval' })
  async submit(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.updateStatus(tenantId, id, 'submitted');
  }

  @Post(':id/approve')
  @RequirePermissions('buying:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a material request' })
  async approve(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.updateStatus(tenantId, id, 'approved', user.userId);
  }

  @Post(':id/reject')
  @RequirePermissions('buying:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a material request' })
  async reject(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.updateStatus(tenantId, id, 'rejected');
  }

  @Post(':id/convert-to-po')
  @RequirePermissions('buying:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert approved material request to purchase order(s)' })
  async convertToPO(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { userId: string },
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.convertToPurchaseOrder(tenantId, id, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('buying:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a material request' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.softDelete(tenantId, id);
  }
}
