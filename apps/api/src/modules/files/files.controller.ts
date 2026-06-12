import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StorageService } from './storage.service.js';
import { JwtAuthGuard } from '../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { SelfScopedGuard } from '../../common/guards/self-scoped.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { ScopeToSelf } from '../../common/decorators/scope-to-self.decorator.js';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator.js';

// ─── Validation rules per upload category ───────────────────────────────

const BRANDING_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);
const BRANDING_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const BRANDING_ERROR = 'Only PNG, JPG, WEBP or SVG images up to 2MB are allowed';

const DOCUMENT_MIME_TYPES = new Set([
  ...BRANDING_MIME_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const DOCUMENT_ERROR =
  'Only images, PDF or Word documents up to 10MB are allowed';

function validateFile(
  file: Express.Multer.File | undefined,
  allowed: Set<string>,
  maxBytes: number,
  errorMessage: string,
): asserts file is Express.Multer.File {
  if (!file || !file.buffer) {
    throw new BadRequestException(
      'No file was uploaded. Attach a file under the "file" form field.',
    );
  }
  if (!allowed.has(file.mimetype)) {
    throw new BadRequestException(errorMessage);
  }
  if (file.size > maxBytes) {
    throw new BadRequestException(errorMessage);
  }
}

/**
 * File upload endpoints backed by Google Cloud Storage.
 *
 * - Branding assets (logos etc.) → public bucket, permanent URL.
 * - Documents (HR / ESS)         → private bucket, object path + signed URL.
 * - GET /files/signed exchanges a stored object path for a fresh, short-lived
 *   read URL — the path must live under the caller's tenant prefix.
 */
@ApiTags('files')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, SelfScopedGuard)
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  // ─── Branding (public bucket) ────────────────────────────────────────

  @Post('files/upload/branding')
  @RequirePermissions('settings:manage')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a branding image (logo, favicon) to the public bucket' })
  @ApiResponse({ status: 201, description: '{ url } — permanent public URL' })
  async uploadBranding(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    validateFile(file, BRANDING_MIME_TYPES, BRANDING_MAX_BYTES, BRANDING_ERROR);
    const { url } = await this.storage.uploadPublic(tenantId, file);
    return { url };
  }

  // ─── Documents (private bucket, HR-side) ─────────────────────────────

  @Post('files/upload/document')
  @RequirePermissions('hr:manage_documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document to the private bucket (HR)' })
  @ApiResponse({
    status: 201,
    description:
      '{ path, url } — store `path`; `url` is a 15-minute signed preview link',
  })
  async uploadDocument(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    validateFile(file, DOCUMENT_MIME_TYPES, DOCUMENT_MAX_BYTES, DOCUMENT_ERROR);
    const { path } = await this.storage.uploadPrivate(tenantId, file);
    const url = await this.storage.getSignedUrl(path);
    return { path, url };
  }

  // ─── Documents (private bucket, ESS self-service) ────────────────────

  @Post('ess/files/upload-document')
  @RequirePermissions('ess:read')
  @ScopeToSelf()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a personal document (ESS)',
    description:
      'Employees upload their own files (resume, ID proof, certificates). Stored in the private bucket under the tenant prefix.',
  })
  @ApiResponse({ status: 201, description: '{ path, url }' })
  async uploadMyDocument(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    validateFile(file, DOCUMENT_MIME_TYPES, DOCUMENT_MAX_BYTES, DOCUMENT_ERROR);
    const { path } = await this.storage.uploadPrivate(tenantId, file);
    const url = await this.storage.getSignedUrl(path);
    return { path, url };
  }

  // ─── Signed read URLs ────────────────────────────────────────────────

  @Get('files/signed')
  @RequirePermissions('hr:read')
  @ApiOperation({ summary: 'Exchange a stored object path for a fresh signed read URL' })
  @ApiQuery({ name: 'path', required: true, description: 'Object path returned by an upload endpoint' })
  @ApiResponse({ status: 200, description: '{ url } — V4 signed URL, 15-minute expiry' })
  async getSignedUrl(
    @CurrentTenant() tenantId: string,
    @Query('path') path?: string,
  ) {
    if (!path || !path.trim()) {
      throw new BadRequestException('Query parameter "path" is required');
    }
    const objectPath = path.trim();
    // Tenant isolation: objects are namespaced `<tenantId>/...` at upload
    // time, so any path outside the caller's prefix is foreign data.
    if (!objectPath.startsWith(`${tenantId}/`)) {
      throw new ForbiddenException('You do not have access to this file');
    }
    const url = await this.storage.getSignedUrl(objectPath);
    return { url };
  }
}
