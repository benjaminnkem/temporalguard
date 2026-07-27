import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, verify } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import type { CreateApiKeyDto, UpdateBusinessDto } from '../dto';
import { Business, BusinessApiKey } from '../entities';
import {
  ApiKeyEnvironment,
  apiKeyPrefixForEnvironment,
} from '../enums/api-key-environment.enum';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businesses: Repository<Business>,
    @InjectRepository(BusinessApiKey)
    private readonly apiKeys: Repository<BusinessApiKey>,
  ) {}

  async getBusiness(businessId: string) {
    const business = await this.businesses.findOne({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException({
        code: 'BUSINESS_NOT_FOUND',
        message: 'Business workspace was not found.',
      });
    }
    return this.toBusinessDto(business);
  }

  async updateBusiness(businessId: string, input: UpdateBusinessDto) {
    const business = await this.businesses.findOne({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException({
        code: 'BUSINESS_NOT_FOUND',
        message: 'Business workspace was not found.',
      });
    }
    business.name = input.name.trim();
    business.website = input.website?.trim() || null;
    business.description = input.description?.trim() || null;
    await this.businesses.save(business);
    return this.toBusinessDto(business);
  }

  async listApiKeys(businessId: string) {
    const keys = await this.apiKeys.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
    return keys.map((key) => this.toApiKeyDto(key));
  }

  async createApiKey(
    businessId: string,
    userId: string,
    input: CreateApiKeyDto,
  ) {
    const environment = input.environment ?? ApiKeyEnvironment.LIVE;
    const rawKey = this.generateRawKey(environment);
    const entity = this.apiKeys.create({
      businessId,
      name: input.name.trim(),
      environment,
      keyPrefix: rawKey.slice(0, 12),
      keyHash: await hash(rawKey),
      createdByUserId: userId,
      lastUsedAt: null,
      revokedAt: null,
    });
    const saved = await this.apiKeys.save(entity);
    return {
      ...this.toApiKeyDto(saved),
      secret: rawKey,
    };
  }

  async revokeApiKey(businessId: string, keyId: string) {
    const key = await this.apiKeys.findOne({
      where: { id: keyId, businessId },
    });
    if (!key) {
      throw new NotFoundException({
        code: 'API_KEY_NOT_FOUND',
        message: 'API key was not found.',
      });
    }
    if (!key.revokedAt) {
      key.revokedAt = new Date();
      await this.apiKeys.save(key);
    }
    return this.toApiKeyDto(key);
  }

  async authenticateApiKey(rawKey: string) {
    if (!rawKey?.startsWith('tg_')) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_API_KEY',
        message: 'API key is invalid.',
      });
    }
    const prefix = rawKey.slice(0, 12);
    const candidates = await this.apiKeys.find({
      where: { keyPrefix: prefix, revokedAt: IsNull() },
      relations: { business: true },
    });
    for (const candidate of candidates) {
      const matches = await verify(candidate.keyHash, rawKey).catch(
        () => false,
      );
      if (!matches) continue;
      candidate.lastUsedAt = new Date();
      await this.apiKeys.save(candidate);
      return {
        businessId: candidate.businessId,
        apiKeyId: candidate.id,
        environment: candidate.environment ?? ApiKeyEnvironment.LIVE,
        business: candidate.business,
      };
    }
    throw new UnauthorizedException({
      code: 'AUTH_INVALID_API_KEY',
      message: 'API key is invalid.',
    });
  }

  private generateRawKey(environment: ApiKeyEnvironment) {
    const entropy = randomBytes(24).toString('base64url');
    return `${apiKeyPrefixForEnvironment(environment)}${entropy}`;
  }

  private toBusinessDto(business: Business) {
    return {
      id: business.id,
      name: business.name,
      logoUrl: business.logoUrl,
      website: business.website,
      description: business.description,
      updatedAt: business.updatedAt.toISOString(),
    };
  }

  private toApiKeyDto(key: BusinessApiKey) {
    return {
      id: key.id,
      name: key.name,
      environment: key.environment ?? ApiKeyEnvironment.LIVE,
      keyPrefix: key.keyPrefix,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      revokedAt: key.revokedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
      fingerprint: createHash('sha256')
        .update(key.keyHash)
        .digest('hex')
        .slice(0, 12),
    };
  }
}
