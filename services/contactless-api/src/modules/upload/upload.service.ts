import crypto from 'node:crypto';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { UploadResult } from '@sharon/shared';
import { AppError } from '../../utils/appError';

export class UploadService {
  private s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly cdnBaseUrl: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucketName =
      process.env.AWS_S3_MEDIA_BUCKET ||
      process.env.AWS_S3_BUCKET ||
      'sharon-tea-media';
    this.cdnBaseUrl =
      process.env.MEDIA_CDN_URL || 'https://d2t9ldc0u0rx0g.cloudfront.net';

    const accessKeyId =
      process.env.AWS_MEDIA_ACCESS_KEY_ID ||
      process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.AWS_MEDIA_SECRET_ACCESS_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
        },
      });
    } else {
      // Defaults to AWS SDK default credentials provider chain (e.g. EC2 instance profile or ~/.aws)
      this.s3Client = new S3Client({ region: this.region });
    }
  }

  async uploadImage(file?: Express.Multer.File): Promise<UploadResult> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new AppError(400, 'NO_FILE_UPLOADED', 'No image file uploaded or file is empty.');
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      throw new AppError(400, 'FILE_TOO_LARGE', 'File size exceeds the 10MB limit.');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(
        400,
        'INVALID_FILE_TYPE',
        'Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, AVIF.',
      );
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const rawBaseName = path
      .parse(file.originalname)
      .name.toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const safeBaseName = rawBaseName.slice(0, 50) || 'upload';
    const randomHex = crypto.randomBytes(4).toString('hex');
    const fileName = `${safeBaseName}-${Date.now()}-${randomHex}${ext}`;
    const s3Key = `uploads/${fileName}`;

    if (!this.s3Client) {
      throw new AppError(500, 'S3_UNAVAILABLE', 'S3 Client is not initialized on the server.');
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    // Prefer CloudFront CDN URL, with direct S3 fallback
    const directS3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
    const url = this.cdnBaseUrl
      ? `${this.cdnBaseUrl.replace(/\/+$/, '')}/${s3Key}`
      : directS3Url;

    return {
      url,
      key: s3Key,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}

export const uploadService = new UploadService();
