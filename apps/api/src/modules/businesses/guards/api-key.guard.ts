import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { BusinessesService } from '../services/businesses.service';

export type ApiKeyAuthenticatedRequest = Request & {
  businessId: string;
  apiKeyId: string;
  authMethod: 'api_key';
};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly businessesService: BusinessesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<ApiKeyAuthenticatedRequest>();
    const header = request.headers['x-api-key'];
    const rawKey = Array.isArray(header) ? header[0] : header;
    if (!rawKey) {
      throw new UnauthorizedException({
        code: 'AUTH_UNAUTHORIZED',
        message: 'API key is required.',
      });
    }
    const result = await this.businessesService.authenticateApiKey(rawKey);
    request.businessId = result.businessId;
    request.apiKeyId = result.apiKeyId;
    request.authMethod = 'api_key';
    return true;
  }
}
