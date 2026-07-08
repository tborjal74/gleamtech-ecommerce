import { AuthenticationService } from './authentication.service.js';

describe('AuthenticationService', () => {
  function serviceWithConfig(configGet: (key: string, fallback?: string) => string | undefined) {
    return new AuthenticationService({} as never, { get: jest.fn(configGet) } as never, {} as never, {} as never);
  }

  it('rejects weak passwords during registration before writing to the database', async () => {
    const prisma = {
      $transaction: jest.fn(),
    };
    const config = { get: jest.fn() };
    const service = new AuthenticationService(prisma as never, config as never, {} as never, {} as never);

    await expect(
      service.register(
        {
          email: 'customer@example.com',
          password: 'abcdefghijkl',
          firstName: 'Ada',
          lastName: 'Lovelace',
        },
        {} as never,
      ),
    ).rejects.toThrow('Password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses SameSite=Lax cookies by default in production', () => {
    const service = serviceWithConfig((key, fallback) => (key === 'NODE_ENV' ? 'production' : fallback));

    expect((service as unknown as { cookieOptions(httpOnly: boolean): { sameSite: string } }).cookieOptions(true)).toMatchObject({
      sameSite: 'lax',
    });
  });

  it('requires an explicit SameSite=None cookie configuration for cross-site deployments', () => {
    const service = serviceWithConfig((key, fallback) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'COOKIE_SAME_SITE') return 'none';
      return fallback;
    });

    expect((service as unknown as { cookieOptions(httpOnly: boolean): { sameSite: string; secure: boolean } }).cookieOptions(true)).toMatchObject({
      sameSite: 'none',
      secure: true,
    });
  });
});
