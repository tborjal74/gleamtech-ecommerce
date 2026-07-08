import { randomBytes, randomUUID } from 'node:crypto';

import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProvider, Prisma, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { CookieOptions, Request, Response } from 'express';

import { ApiError } from '../common/api-error.js';
import { toPublicUser } from '../common/public-user.js';
import { PrismaService } from '../database/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { CSRF_COOKIE, SESSION_COOKIE } from './auth.types.js';
import type { GoogleCredentialDto } from './dto/google-credential.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { TwoFactorLoginDto } from './dto/two-factor-login.dto.js';
import { createCsrfToken, createSessionToken, hashSessionToken } from './session.util.js';
import { TotpService } from './totp.service.js';

const OAUTH_STATE_COOKIE = 'gleamtech_oauth_state';
interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
}

interface GoogleTokenInfo extends GoogleUserInfo {
  aud?: string;
  exp?: string;
  iss?: string;
}

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly totp: TotpService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterDto, response: Response) {
    const email = this.normalizeEmail(dto.email);
    this.assertStrongPassword(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds());

    try {
      const user = await this.prisma.$transaction(async tx => {
        const created = await tx.user.create({
          data: {
            email,
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
          },
        });
        await tx.cart.create({ data: { userId: created.id } });
        return created;
      });

      const session = await this.createSession(user.id);
      this.setSessionCookies(response, session.rawToken, session.csrfToken);

      return this.authResponse(user, session);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(HttpStatus.CONFLICT, 'EMAIL_ALREADY_EXISTS', 'Email is already registered.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, response: Response) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.active || !user.passwordHash) {
      throw this.invalidCredentials();
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw this.invalidCredentials();
    }

    return this.authOrTwoFactorResponse(user, response);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { oauthAccounts: true },
    });
    const canReceivePasswordReset = Boolean(user?.active && (user.passwordHash || user.oauthAccounts.length > 0));
    if (user && canReceivePasswordReset) {
      const rawToken = createSessionToken();
      await this.prisma.passwordResetToken.create({
        data: {
          tokenHash: hashSessionToken(rawToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      const resetUrl = `${this.frontendUrl()}?resetToken=${encodeURIComponent(rawToken)}`;
      await this.email.sendPasswordResetEmail(user.email, resetUrl).catch(() => undefined);
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    this.assertStrongPassword(dto.password);
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashSessionToken(dto.token) },
      include: { user: true },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date() || !token.user.active) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PASSWORD_RESET_INVALID', 'Password reset link is invalid or expired.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash: await bcrypt.hash(dto.password, this.bcryptSaltRounds()) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.deleteMany({ where: { userId: token.userId } }),
      this.prisma.twoFactorChallenge.deleteMany({ where: { userId: token.userId } }),
    ]);
    return { ok: true };
  }

  async completeTwoFactorLogin(dto: TwoFactorLoginDto, response: Response) {
    const challenge = await this.prisma.twoFactorChallenge.findUnique({
      where: { tokenHash: hashSessionToken(dto.challengeToken) },
      include: { user: true },
    });
    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date() || !challenge.user.active) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_TWO_FACTOR_CHALLENGE', 'Two-factor sign-in expired. Please sign in again.');
    }
    if (!challenge.user.totpEnabled || !challenge.user.totpSecretEncrypted) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'TWO_FACTOR_NOT_ENABLED', 'Two-factor authentication is not enabled.');
    }

    const valid = this.totp.verify(this.totp.decryptSecret(challenge.user.totpSecretEncrypted), dto.code);
    if (!valid) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_TWO_FACTOR_CODE', 'The authenticator code is invalid.');
    }

    await this.prisma.twoFactorChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    const session = await this.createSession(challenge.user.id);
    this.setSessionCookies(response, session.rawToken, session.csrfToken);
    return this.authResponse(challenge.user, session);
  }

  async logout(sessionId: string, response: Response) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
    response.clearCookie(SESSION_COOKIE, this.cookieOptions(true));
    response.clearCookie(CSRF_COOKIE, this.cookieOptions(false));
  }

  getGoogleAuthorizationUrl(response: Response): string {
    const clientId = this.requiredConfig('GOOGLE_CLIENT_ID');
    const redirectUri = this.googleRedirectUri();
    const state = randomBytes(32).toString('base64url');
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.cookieOptions(true),
      maxAge: 10 * 60 * 1000,
    });

    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');
    return authUrl.toString();
  }

  async handleGoogleCallback({
    code,
    state,
    request,
    response,
  }: {
    code?: string;
    state?: string;
    request: Request;
    response: Response;
  }) {
    const frontendUrl = this.frontendUrl();
    const expectedState = request.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    response.clearCookie(OAUTH_STATE_COOKIE, this.cookieOptions(true));

    try {
      if (!code || !state || !expectedState || state !== expectedState) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_OAUTH_STATE', 'OAuth session expired. Try again.');
      }

      const profile = await this.fetchGoogleProfile(code);
      const user = await this.findOrCreateGoogleUser(profile);
      if (user.totpEnabled) {
        throw new ApiError(HttpStatus.FORBIDDEN, 'TWO_FACTOR_REQUIRED', 'Use the sign-in form to complete two-factor authentication.');
      }
      const session = await this.createSession(user.id);
      this.setSessionCookies(response, session.rawToken, session.csrfToken);
      response.redirect(`${frontendUrl}?auth=oauth_success`);
    } catch {
      response.redirect(`${frontendUrl}?auth=oauth_error`);
    }
  }

  async loginWithGoogleCredential(dto: GoogleCredentialDto, response: Response) {
    const profile = await this.verifyGoogleCredential(dto.credential);
    const user = await this.findOrCreateGoogleUser(profile);
    return this.authOrTwoFactorResponse(user, response);
  }

  private async createSession(userId: string) {
    const rawToken = createSessionToken();
    const csrfToken = createCsrfToken();
    const durationDays = Number(this.config.get<string>('SESSION_DURATION_DAYS', '7'));
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        id: randomUUID(),
        tokenHash: hashSessionToken(rawToken),
        csrfToken,
        userId,
        expiresAt,
      },
    });

    return { rawToken, csrfToken };
  }

  private setSessionCookies(response: Response, rawToken: string, csrfToken: string) {
    response.cookie(SESSION_COOKIE, rawToken, this.cookieOptions(true));
    response.cookie(CSRF_COOKIE, csrfToken, this.cookieOptions(false));
  }

  private authResponse(user: User, session: { rawToken: string; csrfToken: string }) {
    return {
      user: toPublicUser(user),
      csrfToken: session.csrfToken,
      ...(this.enableBearerSessionFallback() ? { sessionToken: session.rawToken } : {}),
    };
  }

  private async authOrTwoFactorResponse(user: User, response: Response) {
    if (user.totpEnabled) {
      return {
        twoFactorRequired: true,
        challengeToken: await this.createTwoFactorChallenge(user.id),
        email: user.email,
      };
    }
    const session = await this.createSession(user.id);
    this.setSessionCookies(response, session.rawToken, session.csrfToken);
    return this.authResponse(user, session);
  }

  private async createTwoFactorChallenge(userId: string) {
    const rawToken = createSessionToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.twoFactorChallenge.deleteMany({
      where: {
        userId,
        OR: [{ expiresAt: { lte: new Date() } }, { consumedAt: { not: null } }],
      },
    });
    await this.prisma.twoFactorChallenge.create({
      data: {
        tokenHash: hashSessionToken(rawToken),
        userId,
        expiresAt,
      },
    });
    return rawToken;
  }

  private enableBearerSessionFallback(): boolean {
    return this.config.get<string>('ENABLE_BEARER_SESSION_FALLBACK', 'false').toLowerCase() === 'true';
  }

  private cookieOptions(httpOnly: boolean): CookieOptions {
    const sameSite = this.cookieSameSite();
    return {
      httpOnly,
      secure: this.config.get<string>('NODE_ENV') === 'production' || sameSite === 'none',
      sameSite,
      path: '/',
    };
  }

  private cookieSameSite(): CookieOptions['sameSite'] {
    const value = this.config.get<string>('COOKIE_SAME_SITE', 'lax').toLowerCase();
    if (value === 'none' || value === 'strict') return value;
    return 'lax';
  }

  private bcryptSaltRounds(): number {
    const configured = Number(this.config.get<string>('BCRYPT_SALT_ROUNDS', '12'));
    if (!Number.isInteger(configured) || configured < 10 || configured > 15) return 12;
    return configured;
  }

  private assertStrongPassword(password: string) {
    const checks = [
      password.length >= 12,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];
    if (!checks.every(Boolean)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters.');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private frontendUrl(): string {
    const configured =
      this.config.get<string>('FRONTEND_URL') ??
      this.config.get<string>('FRONTEND_URLS')?.split(',')[0] ??
      'http://localhost:5173';
    const frontendUrl = configured.trim().replace(/\/$/, '');
    if (this.config.get<string>('NODE_ENV') === 'production' && !frontendUrl.startsWith('https://')) {
      throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'CONFIGURATION_ERROR', 'FRONTEND_URL must use HTTPS in production.');
    }
    return frontendUrl;
  }

  private apiPublicUrl(): string {
    const configured = this.config.get<string>('API_PUBLIC_URL');
    if (configured) return configured.trim().replace(/\/$/, '');

    const port = this.config.get<string>('PORT', '4000');
    return `http://localhost:${port}`;
  }

  private googleRedirectUri(): string {
    return (
      this.config.get<string>('GOOGLE_REDIRECT_URI') ??
      `${this.apiPublicUrl()}/api/auth/google/callback`
    );
  }

  private requiredConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'CONFIGURATION_ERROR', `${key} is not configured.`);
    }
    return value;
  }

  private async fetchGoogleProfile(code: string): Promise<GoogleUserInfo> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.requiredConfig('GOOGLE_CLIENT_ID'),
        client_secret: this.requiredConfig('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.googleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });

    const tokenBody = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'OAUTH_TOKEN_EXCHANGE_FAILED',
        tokenBody.error_description ?? tokenBody.error ?? 'Could not verify Google account.',
      );
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { authorization: `Bearer ${tokenBody.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new ApiError(HttpStatus.BAD_GATEWAY, 'OAUTH_PROFILE_FAILED', 'Could not read Google profile.');
    }

    return (await profileResponse.json()) as GoogleUserInfo;
  }

  private async verifyGoogleCredential(credential: string): Promise<GoogleUserInfo> {
    const tokenInfoUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
    tokenInfoUrl.searchParams.set('id_token', credential);

    const tokenInfoResponse = await fetch(tokenInfoUrl);
    if (!tokenInfoResponse.ok) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_GOOGLE_CREDENTIAL', 'Google sign-in could not be verified.');
    }

    const tokenInfo = (await tokenInfoResponse.json()) as GoogleTokenInfo;
    const clientId = this.requiredConfig('GOOGLE_CLIENT_ID');
    const issuer = tokenInfo.iss;
    const expiresAt = Number(tokenInfo.exp ?? '0') * 1000;

    if (
      tokenInfo.aud !== clientId ||
      (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') ||
      !expiresAt ||
      expiresAt <= Date.now()
    ) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_GOOGLE_CREDENTIAL', 'Google sign-in could not be verified.');
    }

    return tokenInfo;
  }

  private async findOrCreateGoogleUser(profile: GoogleUserInfo) {
    const emailVerified = profile.email_verified === true || profile.email_verified === 'true';
    if (!profile.sub || !profile.email || !emailVerified) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'OAUTH_EMAIL_REQUIRED', 'Google account must have a verified email.');
    }

    const providerAccountId = profile.sub;
    const email = this.normalizeEmail(profile.email);
    const linkedAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: OAuthProvider.GOOGLE,
          providerAccountId,
        },
      },
      include: { user: true },
    });

    if (linkedAccount?.user.active) return linkedAccount.user;

    return this.prisma.$transaction(async tx => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email,
            passwordHash: null,
            firstName: this.profileFirstName(profile),
            lastName: this.profileLastName(profile),
          },
        }));

      await tx.cart.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });

      await tx.oAuthAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: OAuthProvider.GOOGLE,
            providerAccountId,
          },
        },
        update: { email, userId: user.id },
        create: {
          provider: OAuthProvider.GOOGLE,
          providerAccountId,
          email,
          userId: user.id,
        },
      });

      return user;
    });
  }

  private profileFirstName(profile: GoogleUserInfo): string {
    return profile.given_name?.trim() || profile.name?.trim().split(/\s+/)[0] || 'Gleamtech';
  }

  private profileLastName(profile: GoogleUserInfo): string {
    return profile.family_name?.trim() || profile.name?.trim().split(/\s+/).slice(1).join(' ') || 'Customer';
  }

  private invalidCredentials() {
    return new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
}
