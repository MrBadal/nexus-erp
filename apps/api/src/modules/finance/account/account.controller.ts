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
import { AccountService } from './account.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('finance/accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'List all accounts (chart of accounts)' })
  @ApiResponse({ status: 200, description: 'Flat list of accounts' })
  async findAll(@CurrentTenant() tenantId: string) {
    return this.accountService.findAll(tenantId);
  }

  @Get('tree')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Get chart of accounts as a tree' })
  @ApiResponse({ status: 200, description: 'Hierarchical account tree' })
  async getTree(@CurrentTenant() tenantId: string) {
    return this.accountService.getTree(tenantId);
  }

  @Get(':id')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiResponse({ status: 200, description: 'Account details' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.accountService.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created' })
  @ApiResponse({ status: 409, description: 'Account code conflict' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body() body: any,
  ) {
    return this.accountService.create(tenantId, body);
  }

  @Put(':id')
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Update account' })
  @ApiResponse({ status: 200, description: 'Account updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: any,
  ) {
    return this.accountService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('accounts:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete account' })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.accountService.softDelete(tenantId, id);
  }
}
