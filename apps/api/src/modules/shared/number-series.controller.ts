import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NumberSeriesService } from './number-series.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe.js';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings/number-series')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NumberSeriesController {
  constructor(private readonly service: NumberSeriesService) {}

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List all number series configurations' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Put(':id')
  @RequirePermissions('settings:write')
  @ApiOperation({ summary: 'Update a number series configuration' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { prefix?: string; suffix?: string; padLength?: number; resetAnnually?: boolean },
  ) {
    return this.service.update(tenantId, id, body);
  }
}
