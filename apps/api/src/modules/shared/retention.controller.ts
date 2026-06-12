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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RetentionService } from './retention.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe.js';

@ApiTags('retention')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  // ─── Retention Policies ────────────────────────────────

  @Get('retention-policies')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List retention policies' })
  async findAllPolicies(@CurrentTenant() tenantId: string) {
    return this.retentionService.findAllPolicies(tenantId);
  }

  @Post('retention-policies')
  @RequirePermissions('settings:write')
  @ApiOperation({ summary: 'Create a retention policy' })
  async createPolicy(
    @CurrentTenant() tenantId: string,
    @Body() body: { documentType: string; retentionDays: number; autoArchive?: boolean },
  ) {
    return this.retentionService.createPolicy(tenantId, body);
  }

  @Put('retention-policies/:id')
  @RequirePermissions('settings:write')
  @ApiOperation({ summary: 'Update a retention policy' })
  async updatePolicy(
    @CurrentTenant() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() body: { retentionDays?: number; autoArchive?: boolean; isActive?: boolean },
  ) {
    return this.retentionService.updatePolicy(tenantId, id, body);
  }

  // ─── Legal Holds ──────────────────────────────────────

  @Get('legal-holds')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List legal holds' })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiQuery({ name: 'documentId', required: false })
  async findLegalHolds(
    @CurrentTenant() tenantId: string,
    @Query('documentType') documentType?: string,
    @Query('documentId') documentId?: string,
  ) {
    return this.retentionService.findLegalHolds(tenantId, documentType, documentId);
  }

  @Post('legal-holds')
  @RequirePermissions('settings:write')
  @ApiOperation({ summary: 'Place a legal hold on a document' })
  async placeLegalHold(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { documentType: string; documentId: string; reason: string },
  ) {
    return this.retentionService.placeLegalHold(tenantId, {
      ...body,
      heldBy: user.sub,
    });
  }

  @Post('legal-holds/:id/release')
  @RequirePermissions('settings:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a legal hold' })
  async releaseLegalHold(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.retentionService.releaseLegalHold(tenantId, id, user.sub);
  }
}
