import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SafeUser } from '../../users/dto/user-response.dto.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SafeUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().authenticatedUser,
);
