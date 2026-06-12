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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContractService } from './contract.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';

@ApiTags('construction-contracts')
@ApiBearerAuth()
@Controller('construction/contracts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Get()
  @RequirePermissions('construction:read')
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.contractService.findAll(tenantId, {
      status,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('construction:read')
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.contractService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('construction:write')
  create(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.contractService.create(tenantId, user?.id, body);
  }

  @Put(':id/status')
  @RequirePermissions('construction:write')
  updateStatus(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body('status') status: string) {
    return this.contractService.updateStatus(tenantId, id, status);
  }

  @Post(':id/boq')
  @RequirePermissions('construction:write')
  addBoqItems(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body('items') items: any[]) {
    return this.contractService.addBoqItems(tenantId, id, items);
  }

  @Delete(':id')
  @RequirePermissions('construction:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.contractService.softDelete(tenantId, id);
  }
}
