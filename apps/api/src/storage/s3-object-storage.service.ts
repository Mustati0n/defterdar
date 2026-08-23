import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Environment } from '../config/environment.js';
import type { ConfigService } from '@nestjs/config';
import { ObjectStorageService } from './object-storage.service.js';

export class S3ObjectStorageService extends ObjectStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly ttl: number;

  constructor(config: ConfigService<Environment, true>) {
    super();
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.ttl = config.get('ATTACHMENT_URL_TTL_SECONDS', { infer: true });
    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true }),
      },
    });
  }

  async createUploadUrl(storageKey: string, mimeType: string, sizeBytes: number) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });
    return this.sign(command);
  }

  async createDownloadUrl(storageKey: string) {
    return this.sign(new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }

  async head(storageKey: string) {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      return { mimeType: result.ContentType ?? null, sizeBytes: result.ContentLength ?? 0 };
    } catch (error: unknown) {
      const name = typeof error === 'object' && error !== null && 'name' in error
        ? (error as { name?: unknown }).name
        : undefined;
      if (name === 'NotFound' || name === 'NoSuchKey') return null;
      throw error;
    }
  }

  async delete(storageKey: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }

  private async sign(command: PutObjectCommand | GetObjectCommand) {
    const url = await getSignedUrl(this.client, command, { expiresIn: this.ttl });
    return { url, expiresAt: new Date(Date.now() + this.ttl * 1000) };
  }
}
