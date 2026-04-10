import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TdsService } from './tds.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('tds')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TdsController {
  constructor(private readonly service: TdsService) {}

  // --- TDS Sections ---

  @Get('tds-sections')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'List active TDS sections' })
  async findAllSections(@CurrentTenant() tenantId: string) {
    return this.service.findAllSections(tenantId);
  }

  @Post('tds-sections/seed-defaults')
  @RequirePermissions('settings:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed default Indian TDS sections' })
  async seedDefaults(@CurrentTenant() tenantId: string) {
    return this.service.seedDefaultSections(tenantId);
  }

  @Post('tds-sections')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Create a TDS section' })
  @ApiResponse({ status: 201, description: 'TDS section created' })
  async createSection(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      section: string;
      description: string;
      rateIndividual: string;
      rateCompany: string;
      thresholdLimit?: string;
      thresholdPeriod?: 'annual' | 'per_transaction';
    },
  ) {
    return this.service.createSection(tenantId, body);
  }

  @Get('tds-sections/:id')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Get TDS section by ID' })
  async findSectionById(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.findSectionById(tenantId, id);
  }

  @Put('tds-sections/:id')
  @RequirePermissions('finance:write')
  @ApiOperation({ summary: 'Update a TDS section' })
  async updateSection(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body()
    body: {
      description?: string;
      rateIndividual?: string;
      rateCompany?: string;
      thresholdLimit?: string;
      thresholdPeriod?: 'annual' | 'per_transaction';
    },
  ) {
    return this.service.updateSection(tenantId, id, body);
  }

  @Post('tds-sections/:id/deactivate')
  @RequirePermissions('finance:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a TDS section' })
  async deactivateSection(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.deactivateSection(tenantId, id);
  }

  // --- TDS Deductions ---

  @Get('tds-deductions/vendor-ledger/:supplierId')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Get vendor TDS ledger' })
  @ApiQuery({ name: 'fiscalYear', required: false })
  async getVendorLedger(
    @CurrentTenant() tenantId: string,
    @Param('supplierId', UuidValidationPipe) supplierId: string,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    const fy = fiscalYear || this.getCurrentFiscalYear();
    return this.service.getVendorTdsLedger(tenantId, supplierId, fy);
  }

  @Get('tds-deductions')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'List TDS deductions' })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiQuery({ name: 'billId', required: false })
  async findDeductions(
    @CurrentTenant() tenantId: string,
    @Query('supplierId') supplierId?: string,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('billId') billId?: string,
  ) {
    if (billId) {
      return this.service.findDeductionsByBill(tenantId, billId);
    }
    if (supplierId) {
      return this.service.findDeductionsByVendor(tenantId, supplierId, fiscalYear);
    }
    // Return empty if no filter specified
    return [];
  }

  private getCurrentFiscalYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (month >= 3) return `${year}-${year + 1}`;
    return `${year - 1}-${year}`;
  }
}
