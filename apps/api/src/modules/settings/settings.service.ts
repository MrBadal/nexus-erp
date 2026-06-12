import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../database/database.module.js';
import { businessSettings } from '../../database/schema/index.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { UpdateBrandingDto } from './dto/update-branding.dto.js';

export interface BrandingSettings {
  appName: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  loginWelcomeText: string | null;
  loginBgUrl: string | null;
  companyName: string | null;
}

@Injectable()
export class SettingsService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findByTenant(tenantId: string) {
    const [settings] = await this.db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.tenantId, tenantId))
      .limit(1);

    if (!settings) {
      // Auto-create with defaults
      const [created] = await this.db
        .insert(businessSettings)
        .values({ tenantId })
        .returning();
      return created;
    }

    return settings;
  }

  async update(tenantId: string, data: UpdateSettingsDto) {
    // Ensure record exists
    await this.findByTenant(tenantId);

    const [updated] = await this.db
      .update(businessSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(businessSettings.tenantId, tenantId))
      .returning();

    return updated;
  }

  // ─── White-label branding ──────────────────────────────────────────────

  async getBranding(tenantId: string): Promise<BrandingSettings> {
    // findByTenant auto-creates the row with defaults when missing (upsert).
    const settings = await this.findByTenant(tenantId);
    return {
      appName: settings.appName,
      logoUrl: settings.logoUrl,
      brandColor: settings.brandColor,
      loginWelcomeText: settings.loginWelcomeText,
      loginBgUrl: settings.loginBgUrl,
      companyName: settings.companyName,
    };
  }

  async updateBranding(tenantId: string, data: UpdateBrandingDto): Promise<BrandingSettings> {
    // Ensure record exists (upsert semantics, same as update()).
    await this.findByTenant(tenantId);

    const [updated] = await this.db
      .update(businessSettings)
      .set({
        appName: data.appName,
        logoUrl: data.logoUrl,
        brandColor: data.brandColor,
        loginWelcomeText: data.loginWelcomeText,
        loginBgUrl: data.loginBgUrl,
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.tenantId, tenantId))
      .returning();

    return {
      appName: updated.appName,
      logoUrl: updated.logoUrl,
      brandColor: updated.brandColor,
      loginWelcomeText: updated.loginWelcomeText,
      loginBgUrl: updated.loginBgUrl,
      companyName: updated.companyName,
    };
  }
}
