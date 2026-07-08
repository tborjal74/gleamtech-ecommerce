import { ExecutionContext } from '@nestjs/common';

import { SessionAuthGuard } from './session-auth.guard.js';

function contextWithRequest(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('SessionAuthGuard', () => {
  it('authenticates with a bearer token when the session cookie is unavailable', async () => {
    const user = { id: 'user-1', active: true };
    const prisma = {
      session: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-1',
          csrfToken: 'csrf-1',
          expiresAt: new Date(Date.now() + 60_000),
          user,
        }),
      },
    };
    const config = { get: jest.fn().mockReturnValue('true') };
    const guard = new SessionAuthGuard(prisma as never, config as never);
    const request = {
      cookies: {},
      header: jest.fn((name: string) => (name === 'authorization' ? 'Bearer raw-session-token' : undefined)),
    };

    await expect(guard.canActivate(contextWithRequest(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      user,
      sessionId: 'session-1',
      csrfToken: 'csrf-1',
      authTransport: 'bearer',
    });
  });

  it('ignores bearer tokens unless the fallback is explicitly enabled', async () => {
    const prisma = {
      session: {
        findUnique: jest.fn(),
      },
    };
    const config = { get: jest.fn().mockReturnValue('false') };
    const guard = new SessionAuthGuard(prisma as never, config as never);
    const request = {
      cookies: {},
      header: jest.fn((name: string) => (name === 'authorization' ? 'Bearer raw-session-token' : undefined)),
    };

    await expect(guard.canActivate(contextWithRequest(request))).rejects.toThrow('Authentication is required.');
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });
});
