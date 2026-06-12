import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrencyService } from './currency.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';

@ApiTags('currencies')
@ApiBearerAuth()
@Controller('finance/currencies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'List all currencies' })
  async findAll() {
    return this.currencyService.findAll();
  }

  @Get('exchange-rates')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'List exchange rates' })
  async getExchangeRates(@CurrentTenant() tenantId: string) {
    return this.currencyService.getExchangeRates(tenantId);
  }

  @Get(':code')
  @RequirePermissions('accounts:read')
  @ApiOperation({ summary: 'Get currency by code' })
  async findByCode(@Param('code') code: string) {
    return this.currencyService.findByCode(code);
  }

  @Post()
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Create currency' })
  async create(@Body() body: { code: string; name: string; symbol: string; decimalPlaces?: number }) {
    return this.currencyService.create(body);
  }

  @Put(':code')
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Update currency' })
  async update(
    @Param('code') code: string,
    @Body() body: { name?: string; symbol?: string; decimalPlaces?: number; isActive?: boolean },
  ) {
    return this.currencyService.update(code, body);
  }

  @Post('exchange-rates')
  @RequirePermissions('accounts:write')
  @ApiOperation({ summary: 'Set exchange rate' })
  async setExchangeRate(
    @CurrentTenant() tenantId: string,
    @Body() body: { fromCurrency: string; toCurrency: string; rate: string; effectiveDate: string; source?: string },
  ) {
    return this.currencyService.setExchangeRate(tenantId, body);
  }
}
