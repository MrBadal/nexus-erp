import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe.js';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @RequirePermissions('tenants:read')
  @ApiOperation({ summary: 'List all tenants' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  async findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  @RequirePermissions('tenants:read')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findById(@Param('id', UuidValidationPipe) id: string) {
    return this.tenantService.findById(id);
  }

  @Post()
  @RequirePermissions('tenants:write')
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 409, description: 'Tenant slug conflict' })
  async create(@Body() body: any) {
    return this.tenantService.create(body);
  }

  @Put(':id')
  @RequirePermissions('tenants:write')
  @ApiOperation({ summary: 'Update tenant' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: any,
  ) {
    return this.tenantService.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('tenants:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete tenant' })
  @ApiResponse({ status: 204, description: 'Tenant deleted' })
  async remove(@Param('id', UuidValidationPipe) id: string) {
    return this.tenantService.softDelete(id);
  }
}
