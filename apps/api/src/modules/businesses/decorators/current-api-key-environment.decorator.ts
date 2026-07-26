import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { ApiKeyAuthenticatedRequest } from '../guards/api-key.guard';
import { ApiKeyEnvironment } from '../enums/api-key-environment.enum';

export const CurrentApiKeyEnvironment = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ApiKeyEnvironment => {
    const request = context
      .switchToHttp()
      .getRequest<ApiKeyAuthenticatedRequest>();
    return request.apiKeyEnvironment ?? ApiKeyEnvironment.LIVE;
  },
);
