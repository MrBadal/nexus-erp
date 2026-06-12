import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaxService } from './tax.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('tax-rates')
@ApiBearerAuth()
@Controller('finance/tax-rates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'List all tax rates' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.taxService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Get tax rate by ID' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.taxService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Create tax rate' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: {
      name: string;
      code: string;
      rate: string;
      type?: 'percentage' | 'fixed';
      scope?: 'sales' | 'purchase' | 'both';
      isCompound?: boolean;
      isInclusive?: boolean;
      accountId?: string;
      reportingCode?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
    },
  ) {
    return this.taxService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Update tax rate' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: {
      name?: string;
      rate?: string;
      scope?: 'sales' | 'purchase' | 'both';
      isCompound?: boolean;
      isInclusive?: boolean;
      accountId?: string;
      reportingCode?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      isActive?: boolean;
    },
  ) {
    return this.taxService.update(tenantId, id, body);
  }

  @Post(':id/deactivate')
  @RequirePermissions('accounts:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate tax rate' })
  async deactivate(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.taxService.deactivate(tenantId, id);
  }
}
