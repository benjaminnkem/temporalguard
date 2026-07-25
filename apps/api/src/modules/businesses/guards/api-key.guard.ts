import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyEnvironment } from '../enums/api-key-environment.enum';
import { BusinessesService } from '../services/businesses.service';
import { extractApiKeyFromRequest } from '../utils/extract-api-key';

export type ApiKeyAuthenticatedRequest = Request & {
  businessId: string;
  apiKeyId: string;
  apiKeyEnvironment: ApiKeyEnvironment;
  authMethod: 'api_key';
};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly businessesService: BusinessesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<ApiKeyAuthenticatedRequest>();
    const rawKey = extractApiKeyFromRequest(request);
    if (!rawKey) {
      throw new UnauthorizedException({
        code: 'AUTH_UNAUTHORIZED',
        message: 'API key is required.',
      });
    }
    const result = await this.businessesService.authenticateApiKey(rawKey);
    request.businessId = result.businessId;
    request.apiKeyId = result.apiKeyId;
    request.apiKeyEnvironment = result.environment;
    request.authMethod = 'api_key';
    return true;
  }
}
