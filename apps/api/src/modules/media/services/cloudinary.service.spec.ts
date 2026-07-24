import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  const unconfigured = {
    get: jest.fn(() => undefined),
  } as unknown as ConfigService;

  it('rejects unsupported file types before contacting storage', async () => {
    const service = new CloudinaryService(unconfigured);
    await expect(
      service.uploadLogo({
        buffer: Buffer.from('not-an-image'),
        mimetype: 'text/plain',
        size: 12,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a stable upload error when storage is unavailable', async () => {
    const service = new CloudinaryService(unconfigured);
    const buffer = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 20, g: 60, b: 80, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    await expect(
      service.uploadLogo({
        buffer,
        mimetype: 'image/png',
        size: buffer.length,
      } as Express.Multer.File),
    ).rejects.toMatchObject({
      response: { code: 'AUTH_LOGO_UPLOAD_FAILED' },
    });
    await expect(
      service.uploadLogo({
        buffer,
        mimetype: 'image/png',
        size: buffer.length,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
