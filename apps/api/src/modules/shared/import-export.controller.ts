import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ImportExportService } from './import-export.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';

@ApiTags('import-export')
@ApiBearerAuth()
@Controller('settings/import-export')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ImportExportController {
  constructor(private readonly service: ImportExportService) {}

  @Get('export')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Export data as CSV' })
  @ApiQuery({ name: 'entity', required: true })
  async exportData(
    @CurrentTenant() tenantId: string,
    @Query('entity') entity: string,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportData(tenantId, entity);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${entity}_export.csv`);
    res.send(csv);
  }

  @Post('import')
  @RequirePermissions('settings:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import data from CSV' })
  async importData(
    @CurrentTenant() tenantId: string,
    @Body() body: { entity: string; csvContent: string; columnMapping?: { csvColumn: string; dbColumn: string }[] },
  ) {
    switch (body.entity) {
      case 'items':
        return this.service.importItems(tenantId, body.csvContent, body.columnMapping);
      case 'employees':
        return this.service.importEmployees(tenantId, body.csvContent, body.columnMapping);
      case 'contacts':
        return this.service.importContacts(tenantId, body.csvContent, body.columnMapping);
      default:
        return { error: `Import not supported for entity: ${body.entity}` };
    }
  }
}
