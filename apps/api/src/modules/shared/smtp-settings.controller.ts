import { Body, Controller, Delete, Get, Post, Put, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MinLength, Min, Max } from 'class-validator';
import { EmailService } from './email.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';

class SmtpSettingsDto {
  @IsString() @MinLength(1) host!: string;
  @IsInt() @Min(1) @Max(65535) port!: number;
  @IsBoolean() secure!: boolean;
  @IsString() @MinLength(1) username!: string;
  @IsOptional() @IsString() password?: string;
  @IsEmail() fromEmail!: string;
  @IsOptional() @IsString() fromName?: string;
  @IsOptional() @IsEmail() replyTo?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

class TestSendDto {
  @IsEmail() to!: string;
}

/**
 * Tenant-scoped SMTP configuration. Restricted to admins via the
 * `settings:manage` permission so HR/Finance/Employee roles can never read or
 * tamper with outbound mail credentials.
 */
@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings/smtp')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SmtpSettingsController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  @RequirePermissions('settings:manage', 'settings:read')
  @ApiOperation({ summary: 'Read current SMTP settings (password redacted)' })
  async get(@CurrentTenant() tenantId: string) {
    const cfg = await this.emailService.getSettings(tenantId);
    return cfg ?? { configured: false };
  }

  @Put()
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: 'Create or update SMTP settings' })
  async upsert(@CurrentTenant() tenantId: string, @Body() body: SmtpSettingsDto) {
    return this.emailService.upsertSettings(tenantId, body);
  }

  @Delete()
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: 'Remove SMTP settings (disables all outbound email)' })
  async remove(@CurrentTenant() tenantId: string) {
    return this.emailService.deleteSettings(tenantId);
  }

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: 'Verify SMTP credentials with the upstream server (no email sent)' })
  async test(@CurrentTenant() tenantId: string) {
    return this.emailService.testConnection(tenantId);
  }

  @Post('test-send')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: 'Send a test email to the supplied address' })
  async send(@CurrentTenant() tenantId: string, @Body() body: TestSendDto) {
    if (!body?.to) throw new BadRequestException('to is required');
    return this.emailService.sendTestEmail(tenantId, body.to);
  }
}
