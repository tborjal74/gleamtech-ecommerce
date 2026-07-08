import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AdminPageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class AdminDateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AdminActivityQueryDto extends AdminPageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityType?: string;
}

export class AdminReportQueryDto extends AdminDateRangeQueryDto {
  @IsOptional()
  @IsIn(['orders', 'products', 'customers'])
  type: 'orders' | 'products' | 'customers' = 'orders';
}
