import { IsDateString, IsIn, IsOptional } from 'class-validator';

export const analyticsPresets = ['today', 'last7', 'last30', 'thisMonth', 'lastMonth', 'custom'] as const;
export type AnalyticsPreset = (typeof analyticsPresets)[number];

export class AdminAnalyticsQueryDto {
  @IsOptional()
  @IsIn(analyticsPresets)
  preset: AnalyticsPreset = 'last30';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
