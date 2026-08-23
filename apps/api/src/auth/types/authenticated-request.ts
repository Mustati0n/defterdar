import type { Request } from 'express';
import type { SafeUser } from '../../users/dto/user-response.dto.js';

export interface AuthenticatedRequest extends Request {
  authenticatedUser: SafeUser;
}
