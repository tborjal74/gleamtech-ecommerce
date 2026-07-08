import { Module } from '@nestjs/common';

import { AuthenticationController } from './authentication.controller.js';
import { AuthenticationService } from './authentication.service.js';
import { EmailModule } from '../email/email.module.js';
import { CsrfGuard } from './csrf.guard.js';
import { RolesGuard } from './roles.guard.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { TotpService } from './totp.service.js';

@Module({
  imports: [EmailModule],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, SessionAuthGuard, CsrfGuard, RolesGuard, TotpService],
  exports: [AuthenticationService, SessionAuthGuard, CsrfGuard, RolesGuard, TotpService],
})
export class AuthenticationModule {}
