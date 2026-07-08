import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function upper(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function optionalDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return new Date(String(value));
}

export class UpsertPromoCodeDto {
  @Transform(({ value }) => upper(value))
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(240)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  percentOff!: number;

  @IsOptional()
  @IsBoolean()
  active = true;

  @IsOptional()
  @Transform(({ value }) => optionalDate(value))
  startsAt?: Date | null;

  @IsOptional()
  @Transform(({ value }) => optionalDate(value))
  endsAt?: Date | null;
}
