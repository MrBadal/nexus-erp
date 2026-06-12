import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

/**
 * Minimal shape of an uploaded file (subset of Express.Multer.File) so the
 * service stays decoupled from the HTTP layer.
 */
export interface UploadableFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/**
 * Google Cloud Storage wrapper.
 *
 * - Authenticates via Application Default Credentials. On GCE/GKE this is
 *   automatic (instance service account); locally, point
 *   GOOGLE_APPLICATION_CREDENTIALS at a service-account JSON key file.
 * - Two buckets:
 *     GCS_PUBLIC_BUCKET  — world-readable assets (logos, branding). Uploads
 *                          return a permanent public URL.
 *     GCS_PRIVATE_BUCKET — tenant documents. Uploads return an object path
 *                          (`<tenantId>/<uuid>-<name>`); reads go through
 *                          short-lived V4 signed URLs.
 * - Every object is namespaced under the tenant id, which doubles as the
 *   cross-tenant access check when signing read URLs.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: Storage | null = null;

  readonly publicBucket: string;
  readonly privateBucket: string;

  constructor(private readonly configService: ConfigService) {
    this.publicBucket =
      this.configService.get<string>('GCS_PUBLIC_BUCKET') ||
      'nexus-erp-public-responsive-sun-462613-d0';
    this.privateBucket =
      this.configService.get<string>('GCS_PRIVATE_BUCKET') ||
      'nexus-erp-files-responsive-sun-462613-d0';
  }

  // ─── Client (lazy, so a misconfigured env doesn't break app boot) ────

  private getClient(): Storage {
    if (!this.client) {
      const keyFilename = this.configService.get<string>(
        'GOOGLE_APPLICATION_CREDENTIALS',
      );
      // With no keyFilename the SDK falls back to Application Default
      // Credentials (automatic on GCE / Cloud Run / GKE workload identity).
      this.client = new Storage(keyFilename ? { keyFilename } : {});
    }
    return this.client;
  }

  // ─── Uploads ─────────────────────────────────────────────────────────

  /**
   * Upload to the public bucket. Returns a permanent, unauthenticated URL —
   * suitable for branding assets (logos, favicons) embedded in pages/emails.
   */
  async uploadPublic(
    tenantId: string,
    file: UploadableFile,
  ): Promise<{ url: string; path: string }> {
    const objectPath = this.buildObjectPath(tenantId, file.originalname);
    await this.save(this.publicBucket, objectPath, file);
    return {
      url: `https://storage.googleapis.com/${this.publicBucket}/${objectPath}`,
      path: objectPath,
    };
  }

  /**
   * Upload to the private bucket. Returns the object path only — callers
   * must use {@link getSignedUrl} to produce a readable link.
   */
  async uploadPrivate(
    tenantId: string,
    file: UploadableFile,
  ): Promise<{ path: string }> {
    const objectPath = this.buildObjectPath(tenantId, file.originalname);
    await this.save(this.privateBucket, objectPath, file);
    return { path: objectPath };
  }

  // ─── Signed reads ────────────────────────────────────────────────────

  /**
   * V4 signed read URL for an object in the private bucket.
   *
   * @param objectPath  `<tenantId>/<uuid>-<name>` as returned by uploadPrivate
   * @param minutes     validity window (default 15, GCS caps V4 at 7 days)
   * @param downloadAs  when set, forces `Content-Disposition: attachment` so
   *                    the browser downloads with this filename
   */
  async getSignedUrl(
    objectPath: string,
    minutes = 15,
    downloadAs?: string,
  ): Promise<string> {
    try {
      const [url] = await this.getClient()
        .bucket(this.privateBucket)
        .file(objectPath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + minutes * 60_000,
          ...(downloadAs
            ? {
                responseDisposition: `attachment; filename="${this.sanitizeFilename(downloadAs)}"`,
              }
            : {}),
        });
      return url;
    } catch (err) {
      this.fail('getSignedUrl', objectPath, err);
    }
  }

  // ─── Internals ───────────────────────────────────────────────────────

  private async save(
    bucketName: string,
    objectPath: string,
    file: UploadableFile,
  ): Promise<void> {
    try {
      await this.getClient()
        .bucket(bucketName)
        .file(objectPath)
        .save(file.buffer, {
          contentType: file.mimetype,
          resumable: false,
        });
    } catch (err) {
      this.fail('upload', `${bucketName}/${objectPath}`, err);
    }
  }

  private buildObjectPath(tenantId: string, originalname: string): string {
    return `${tenantId}/${randomUUID()}-${this.sanitizeFilename(originalname)}`;
  }

  /** Strip path separators / odd characters so user input can't escape the tenant prefix. */
  private sanitizeFilename(name: string): string {
    const base = name.replace(/^.*[\\/]/, '').trim();
    const safe = base
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 100);
    return safe || 'file';
  }

  private fail(op: string, target: string, err: unknown): never {
    const msg = err instanceof Error ? err.message : String(err);
    this.logger.error(`GCS ${op} failed for "${target}": ${msg}`);
    throw new InternalServerErrorException(
      'File storage is not configured or unreachable. Please contact your administrator.',
    );
  }
}
