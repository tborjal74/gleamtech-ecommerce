import type { User } from '@prisma/client';

export const SESSION_COOKIE = 'gleamtech_session';
export const CSRF_COOKIE = 'gleamtech_csrf';

export interface AuthenticatedRequest {
  user: User;
  sessionId: string;
  csrfToken: string;
  authTransport?: 'cookie' | 'bearer';
}
