import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  it('encrypts with a randomized authenticated envelope', () => {
    const service = new EncryptionService(
      new ConfigService({ encryptionKey: key }),
    );
    const first = service.encrypt('secret-api-key');
    const second = service.encrypt('secret-api-key');

    expect(first).toMatch(/^v1\./);
    expect(first).not.toBe(second);
    expect(first).not.toContain('secret-api-key');
    expect(service.decrypt(first)).toBe('secret-api-key');
  });

  it('rejects tampered ciphertext', () => {
    const service = new EncryptionService(
      new ConfigService({ encryptionKey: key }),
    );
    const encrypted = service.encrypt('secret-api-key');
    expect(() => service.decrypt(`${encrypted}x`)).toThrow();
  });

  it('rejects a key with the wrong length', () => {
    expect(
      () =>
        new EncryptionService(
          new ConfigService({
            encryptionKey: Buffer.alloc(16).toString('base64'),
          }),
        ),
    ).toThrow('exactly 32 bytes');
  });
});
