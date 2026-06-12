import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { UpdateBrandingDto } from './dto/update-branding.dto.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organization')
  @RequirePermissions('settings:read')
  async getOrganization(@CurrentTenant() tenantId: string) {
    return this.settingsService.findByTenant(tenantId);
  }

  @Put('organization')
  @RequirePermissions('settings:write')
  async updateOrganization(
    @CurrentTenant() tenantId: string,
    @Body() data: UpdateSettingsDto,
  ) {
    return this.settingsService.update(tenantId, data);
  }

  // ─── White-label branding ──────────────────────────────────────────────

  /**
   * Branding is intentionally readable by EVERY authenticated user (no
   * @RequirePermissions) — the app shell (sidebar logo, accent color) needs
   * it regardless of role. PermissionsGuard passes when no permissions are
   * required; JwtAuthGuard still enforces authentication.
   */
  @Get('branding')
  async getBranding(@CurrentTenant() tenantId: string) {
    return this.settingsService.getBranding(tenantId);
  }

  @Put('branding')
  @RequirePermissions('settings:manage')
  async updateBranding(
    @CurrentTenant() tenantId: string,
    @Body() data: UpdateBrandingDto,
  ) {
    return this.settingsService.updateBranding(tenantId, data);
  }
}
