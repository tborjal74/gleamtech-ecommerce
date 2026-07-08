import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from './auth.types.js';
import { CurrentAuth } from './current-auth.decorator.js';
import { GoogleCredentialDto } from './dto/google-credential.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { TwoFactorLoginDto } from './dto/two-factor-login.dto.js';
import { CsrfGuard } from './csrf.guard.js';
import { AuthenticationService } from './authentication.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';

@Controller('api/auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    return this.authenticationService.register(dto, response);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.authenticationService.login(dto, response);
  }

  @Post('password/forgot')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authenticationService.forgotPassword(dto);
  }

  @Post('password/reset')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authenticationService.resetPassword(dto);
  }

  @Post('login/2fa')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async completeTwoFactorLogin(@Body() dto: TwoFactorLoginDto, @Res({ passthrough: true }) response: Response) {
    return this.authenticationService.completeTwoFactorLogin(dto, response);
  }

  @Get('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startGoogleOAuth(@Res() response: Response) {
    response.redirect(this.authenticationService.getGoogleAuthorizationUrl(response));
  }

  @Get('google/callback')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async handleGoogleOAuthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    await this.authenticationService.handleGoogleCallback({ code, state, request, response });
  }

  @Post('google/credential')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async loginWithGoogleCredential(
    @Body() dto: GoogleCredentialDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authenticationService.loginWithGoogleCredential(dto, response);
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authenticationService.logout(auth.sessionId, response);
    return { ok: true };
  }
}
