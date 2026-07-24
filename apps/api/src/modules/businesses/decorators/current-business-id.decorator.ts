import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { WorkspaceAuthRequest } from '../guards/workspace-auth.guard';

export const CurrentBusinessId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<WorkspaceAuthRequest>();
    return request.businessId;
  },
);
