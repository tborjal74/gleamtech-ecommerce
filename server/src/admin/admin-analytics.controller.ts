import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../authentication/roles.decorator.js';
import { RolesGuard } from '../authentication/roles.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto.js';

@Controller('api/admin/analytics')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get()
  getAnalytics(@Query() query: AdminAnalyticsQueryDto) {
    return this.analyticsService.getAnalytics(query);
  }
}
