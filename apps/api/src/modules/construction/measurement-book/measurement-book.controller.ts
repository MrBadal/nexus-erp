import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MeasurementBookService } from './measurement-book.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('construction-measurement-books')
@ApiBearerAuth()
@Controller('construction/measurement-books')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MeasurementBookController {
  constructor(private readonly measurementBookService: MeasurementBookService) {}

  @Get()
  @RequirePermissions('construction:read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('contractId') contractId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.measurementBookService.findAll(tenantId, { contractId, status, search });
  }

  @Get(':id')
  @RequirePermissions('construction:read')
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.measurementBookService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('construction:write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.measurementBookService.create(tenantId, user?.id, body);
  }

  @Put(':id/approve')
  @RequirePermissions('construction:write')
  approve(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.measurementBookService.approve(tenantId, id);
  }

  @Post(':id/lines')
  @RequirePermissions('construction:write')
  addLines(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.measurementBookService.addLines(tenantId, id, body.lines ?? body);
  }
}
