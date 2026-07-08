import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { ApiError } from '../common/api-error.js';
import { RolesGuard } from './roles.guard.js';

function contextWithUser(role?: UserRole, email = 'admin@example.com') {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: role
          ? {
              role,
              email,
            }
          : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const config = { get: jest.fn((key: string) => (key === 'ADMIN_EMAIL' ? 'admin@example.com' : undefined)) };

  it('allows users with a required role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, config as never);

    expect(guard.canActivate(contextWithUser(UserRole.ADMIN))).toBe(true);
  });

  it('rejects authenticated users without a required role with 403', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, config as never);

    expect(() => guard.canActivate(contextWithUser(UserRole.CUSTOMER))).toThrow(ApiError);
    expect(() => guard.canActivate(contextWithUser(UserRole.CUSTOMER))).toThrow('Administrator access is required.');
  });

  it('rejects an admin role when the email is not admin-allowlisted', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, config as never);

    expect(() => guard.canActivate(contextWithUser(UserRole.ADMIN, 'attacker@example.com'))).toThrow(ApiError);
  });

  it('rejects missing authentication with 401', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector, config as never);

    expect(() => guard.canActivate(contextWithUser())).toThrow('Authentication is required.');
  });
});
