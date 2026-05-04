import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Form16Service } from './form-16.service.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@ApiTags('hr-form-16')
@ApiBearerAuth()
@Controller('hr/payroll/form-16')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class Form16Controller {
  constructor(private readonly form16Service: Form16Service) {}

  @Get(':employeeId/:fy')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Generate Form 16 PDF for an employee for a fiscal year' })
  @ApiResponse({ status: 200, description: 'PDF binary' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async generate(
    @CurrentTenant() tenantId: string,
    @Param('employeeId', UuidValidationPipe) employeeId: string,
    @Param('fy') fy: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.form16Service.generate(tenantId, employeeId, fy);
    const filename = `form-16-${employeeId}-${fy}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  }
}
