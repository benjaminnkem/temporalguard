import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';

export type UploadedLogo = {
  secureUrl: string;
  publicId: string;
};

@Injectable()
export class CloudinaryService {
  private readonly folder: string;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');
    this.folder =
      this.configService.get<string>('cloudinary.folder') ??
      'temporalguard/workspaces';
    this.configured = Boolean(cloudName && apiKey && apiSecret);
    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadLogo(file: Express.Multer.File): Promise<UploadedLogo> {
    await this.validate(file);
    if (!this.configured) {
      throw new ServiceUnavailableException({
        code: 'AUTH_LOGO_UPLOAD_FAILED',
        message: 'Logo storage is not configured.',
      });
    }
    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: this.folder,
            resource_type: 'image',
            overwrite: false,
            transformation: [
              { width: 512, height: 512, crop: 'limit' },
              { fetch_format: 'auto', quality: 'auto' },
            ],
          },
          (error, response) => {
            if (error || !response)
              reject(
                error instanceof Error
                  ? error
                  : new Error('No upload response'),
              );
            else resolve(response);
          },
        );
        stream.end(file.buffer);
      });
      return { secureUrl: result.secure_url, publicId: result.public_id };
    } catch {
      throw new ServiceUnavailableException({
        code: 'AUTH_LOGO_UPLOAD_FAILED',
        message: 'The logo could not be stored. Try again.',
      });
    }
  }

  async deleteAsset(publicId: string): Promise<void> {
    if (!this.configured) return;
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
  }

  private async validate(file: Express.Multer.File): Promise<void> {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype) || file.size > 5 * 1024 * 1024) {
      throw new BadRequestException({
        code: 'AUTH_INVALID_LOGO',
        message: 'Logo must be a PNG, JPEG, or WebP image up to 5 MB.',
      });
    }
    try {
      const metadata = await sharp(file.buffer).metadata();
      if (
        !metadata.width ||
        !metadata.height ||
        metadata.width < 128 ||
        metadata.height < 128 ||
        metadata.width > 6000 ||
        metadata.height > 6000
      ) {
        throw new Error('Invalid dimensions');
      }
    } catch {
      throw new BadRequestException({
        code: 'AUTH_INVALID_LOGO',
        message: 'Logo must be a valid image between 128px and 6000px.',
      });
    }
  }
}
